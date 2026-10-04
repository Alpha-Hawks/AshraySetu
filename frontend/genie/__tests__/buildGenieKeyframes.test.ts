/**
 * Unit Tests for buildGenieKeyframes.ts
 *
 * Validates:
 * 1. Command-structure invariance: every keyframe has identical command types in identical order.
 * 2. Final frame equality: the final frame is mathematically identical to the full rectangle [0, 0, W, H].
 * 3. Axis selection: correct edge detection for all 4 edges (top, bottom, left, right).
 * 4. Origin clamping: tip center and bounds are clamped when origin is outside the page box.
 * 5. Reduced motion: pure 120ms cross-fade keyframes without transforms or clip-paths.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildGenieKeyframes,
  buildGenieCloseKeyframes,
  buildOldPageKeyframes,
  buildReducedMotionKeyframes,
  detectNearestEdge,
  solveCubicBezier,
  evaluateGenieEasing,
  type SimpleRect,
  type GenieEdge,
} from "../buildGenieKeyframes.ts";

describe("macOS Genie Motion Geometry Engine", () => {
  const box: SimpleRect = {
    left: 100,
    top: 134,
    right: 1100,
    bottom: 934,
    width: 1000,
    height: 800,
  };

  const edges: GenieEdge[] = ["top", "bottom", "left", "right"];

  // Helper to extract SVG path command sequence (e.g. ["M", "C", "L", "C", "L", "Z"])
  function extractPathCommands(pathStr: string): string[] {
    const match = pathStr.match(/path\("([^"]+)"\)/);
    const d = match ? match[1] : pathStr;
    const commands = d.match(/[MCLZz]/g) || [];
    return commands.map((c) => c.toUpperCase());
  }

  test("1. Command-Structure Invariance across all frames and all 4 edges", () => {
    const originTop: SimpleRect = {
      left: 450,
      top: 60,
      right: 550,
      bottom: 100,
      width: 100,
      height: 40,
    };

    const EXPECTED_COMMANDS = ["M", "C", "L", "C", "L", "Z"];

    for (const edge of edges) {
      const keyframes = buildGenieKeyframes(originTop, box, {
        edge,
        frameCount: 30,
      });

      assert.equal(
        keyframes.length,
        30,
        `Expected 30 keyframes for edge ${edge}`
      );

      keyframes.forEach((kf, idx) => {
        assert.ok(
          kf.clipPath,
          `Keyframe ${idx} for edge ${edge} must have clipPath`
        );
        const cmds = extractPathCommands(kf.clipPath!);
        assert.deepEqual(
          cmds,
          EXPECTED_COMMANDS,
          `Frame ${idx} (${kf.offset}) on edge "${edge}" broke command sequence invariance! Received: ${JSON.stringify(cmds)}`
        );
      });
    }
  });

  test("2. Final Frame (offset = 1.0) equals the exact full rectangle [0, 0, W, H] with zero seams", () => {
    const origin: SimpleRect = {
      left: 500,
      top: 950,
      right: 550,
      bottom: 990,
      width: 50,
      height: 40,
    };

    const W = box.width; // 1000
    const H = box.height; // 800

    // Test for Top edge (Navbar)
    const topKeyframes = buildGenieKeyframes(origin, box, {
      edge: "top",
      frameCount: 30,
    });
    const finalTop = topKeyframes[topKeyframes.length - 1];
    assert.equal(finalTop.offset, 1);
    assert.equal(finalTop.transform, "translate3d(0px, 0px, 0)");
    assert.equal(
      finalTop.clipPath,
      `path("M 0 0 C 0 ${Math.round((H / 3) * 1000) / 1000}, 0 ${Math.round(((2 * H) / 3) * 1000) / 1000}, 0 ${H} L ${W} ${H} C ${W} ${Math.round(((2 * H) / 3) * 1000) / 1000}, ${W} ${Math.round((H / 3) * 1000) / 1000}, ${W} 0 L 0 0 Z")`
    );

    // Test for Bottom edge (Dock)
    const bottomKeyframes = buildGenieKeyframes(origin, box, {
      edge: "bottom",
      frameCount: 30,
    });
    const finalBottom = bottomKeyframes[bottomKeyframes.length - 1];
    assert.equal(finalBottom.offset, 1);
    assert.equal(finalBottom.transform, "translate3d(0px, 0px, 0)");
    assert.equal(
      finalBottom.clipPath,
      `path("M 0 ${H} C 0 ${Math.round(((2 * H) / 3) * 1000) / 1000}, 0 ${Math.round((H / 3) * 1000) / 1000}, 0 0 L ${W} 0 C ${W} ${Math.round((H / 3) * 1000) / 1000}, ${W} ${Math.round(((2 * H) / 3) * 1000) / 1000}, ${W} ${H} L 0 ${H} Z")`
    );

    // Test for Left edge (Sidebar)
    const leftKeyframes = buildGenieKeyframes(origin, box, {
      edge: "left",
      frameCount: 30,
    });
    const finalLeft = leftKeyframes[leftKeyframes.length - 1];
    assert.equal(finalLeft.offset, 1);
    assert.equal(finalLeft.transform, "translate3d(0px, 0px, 0)");
    assert.equal(
      finalLeft.clipPath,
      `path("M 0 0 C ${Math.round((W / 3) * 1000) / 1000} 0, ${Math.round(((2 * W) / 3) * 1000) / 1000} 0, ${W} 0 L ${W} ${H} C ${Math.round(((2 * W) / 3) * 1000) / 1000} ${H}, ${Math.round((W / 3) * 1000) / 1000} ${H}, 0 ${H} L 0 0 Z")`
    );

    // Test for Right edge
    const rightKeyframes = buildGenieKeyframes(origin, box, {
      edge: "right",
      frameCount: 30,
    });
    const finalRight = rightKeyframes[rightKeyframes.length - 1];
    assert.equal(finalRight.offset, 1);
    assert.equal(finalRight.transform, "translate3d(0px, 0px, 0)");
    assert.equal(
      finalRight.clipPath,
      `path("M ${W} 0 C ${Math.round(((2 * W) / 3) * 1000) / 1000} 0, ${Math.round((W / 3) * 1000) / 1000} 0, 0 0 L 0 ${H} C ${Math.round((W / 3) * 1000) / 1000} ${H}, ${Math.round(((2 * W) / 3) * 1000) / 1000} ${H}, ${W} ${H} L ${W} 0 Z")`
    );
  });

  test("3. Axis / Edge Selection for all 4 edges", () => {
    // Top nav origin: above box center
    const topOrigin: SimpleRect = {
      left: 500,
      top: 50,
      right: 600,
      bottom: 90,
      width: 100,
      height: 40,
    };
    assert.equal(detectNearestEdge(topOrigin, box), "top");

    // Bottom dock origin: near or below bottom
    const bottomOrigin: SimpleRect = {
      left: 500,
      top: 960,
      right: 600,
      bottom: 1000,
      width: 100,
      height: 40,
    };
    assert.equal(detectNearestEdge(bottomOrigin, box), "bottom");

    // Left sidebar origin
    const leftOrigin: SimpleRect = {
      left: 10,
      top: 400,
      right: 50,
      bottom: 440,
      width: 40,
      height: 40,
    };
    assert.equal(detectNearestEdge(leftOrigin, box), "left");

    // Right dock origin
    const rightOrigin: SimpleRect = {
      left: 1150,
      top: 400,
      right: 1200,
      bottom: 440,
      width: 50,
      height: 40,
    };
    assert.equal(detectNearestEdge(rightOrigin, box), "right");
  });

  test("4. Origin Clamping when origin is outside the page box", () => {
    // Origin far off to the left of the page box
    const offscreenOrigin: SimpleRect = {
      left: -200,
      top: 50,
      right: -100,
      bottom: 90,
      width: 100,
      height: 40,
    };

    const keyframes = buildGenieKeyframes(offscreenOrigin, box, {
      edge: "top",
      frameCount: 25,
    });
    assert.equal(keyframes.length, 25);

    // Initial frame must be clamped within the box width [0, W]
    const firstFrame = keyframes[0];
    const match = firstFrame.clipPath!.match(/M ([\d.-]+) ([\d.-]+)/);
    assert.ok(match, "First frame should start with M x y");
    const startX = parseFloat(match[1]);
    const startY = parseFloat(match[2]);
    assert.ok(
      startX >= 0 && startX <= box.width,
      `Clamped startX (${startX}) should be within [0, ${box.width}]`
    );
    assert.equal(startY, 0, "Tip Y for top edge should be 0");
  });

  test("5. Cubic Bezier Easing Evaluator", () => {
    assert.equal(solveCubicBezier(0.22, 1, 0.36, 1, 0), 0);
    assert.equal(solveCubicBezier(0.22, 1, 0.36, 1, 1), 1);
    assert.equal(evaluateGenieEasing(0), 0);
    assert.equal(evaluateGenieEasing(1), 1);

    // Midpoint should exhibit snappy macOS ease-out curve (value > 0.5)
    const mid = evaluateGenieEasing(0.5);
    assert.ok(mid > 0.75, `Expected snappy ease-out (> 0.75), got ${mid}`);
  });

  test("6. Old Page Keyframes (Receding snapshot)", () => {
    const oldFrames = buildOldPageKeyframes();
    assert.equal(oldFrames.length, 3);
    assert.equal(oldFrames[0].opacity, 1);
    assert.equal(oldFrames[0].transform, "scale3d(1, 1, 1)");
    assert.equal(oldFrames[1].offset, 0.6);
    assert.equal(oldFrames[1].opacity, 0.4);
    assert.equal(oldFrames[1].transform, "scale3d(0.985, 0.985, 1)");
    assert.equal(oldFrames[2].offset, 1.0);
    assert.equal(oldFrames[2].opacity, 0);
  });

  test("7. Reduced Motion Fallback Keyframes", () => {
    const { oldPage, newPage } = buildReducedMotionKeyframes();
    assert.equal(oldPage.length, 2);
    assert.equal(newPage.length, 2);
    assert.equal(newPage[0].opacity, 0);
    assert.equal(newPage[1].opacity, 1);
    assert.equal(newPage[0].transform, "none");
    assert.equal(newPage[1].transform, "none");
  });

  test("8. Reverse Genie Close Keyframes (Dock Minimization)", () => {
    const dockOrigin: SimpleRect = {
      left: 500,
      top: 960,
      right: 600,
      bottom: 1000,
      width: 100,
      height: 40,
    };

    const closeFrames = buildGenieCloseKeyframes(dockOrigin, box, {
      edge: "bottom",
      frameCount: 30,
    });

    assert.equal(closeFrames.length, 30);

    // Frame 0 must be at offset 0, fully opaque, and cover the full rectangle
    const firstFrame = closeFrames[0];
    assert.equal(firstFrame.offset, 0);
    assert.equal(firstFrame.opacity, 1);
    assert.equal(firstFrame.transform, "translate3d(0px, 0px, 0)");

    // Frame 29 (final) must be at offset 1, with opacity 0 (absorbed into dock)
    const finalFrame = closeFrames[closeFrames.length - 1];
    assert.equal(finalFrame.offset, 1);
    assert.equal(finalFrame.opacity, 0);

    // All frames must maintain SVG command sequence invariance [M, C, L, C, L, Z]
    const EXPECTED_COMMANDS = ["M", "C", "L", "C", "L", "Z"];
    closeFrames.forEach((kf, idx) => {
      assert.ok(kf.clipPath, `Close keyframe ${idx} must have clipPath`);
      const cmds = extractPathCommands(kf.clipPath!);
      assert.deepEqual(
        cmds,
        EXPECTED_COMMANDS,
        `Close frame ${idx} (${kf.offset}) broke command invariance!`
      );
    });
  });
});

