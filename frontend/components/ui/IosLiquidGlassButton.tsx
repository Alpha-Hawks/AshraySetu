"use client";

import React, { useId } from "react";

interface IosLiquidGlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: string;
  className?: string;
  children?: React.ReactNode;
}

export function IosLiquidGlassButton({
  size = "20rem",
  className = "",
  children,
  ...props
}: IosLiquidGlassButtonProps) {
  const uniqueId = useId().replace(/[^a-zA-Z0-9-_]/g, "");
  const filterId = `frosted-${uniqueId}`;
  const btnId = `btn-${uniqueId}`;

  return (
    <>
      <button
        id={btnId}
        className={`ios-liquid-glass ${className}`}
        style={{
          width: size,
          height: size,
          backdropFilter: `url(#${filterId}) blur(4px) saturate(180%)`,
          WebkitBackdropFilter: `url(#${filterId}) blur(4px) saturate(180%)`,
        }}
        {...props}
      >
        {children || (
          <span className="ios-liquid-glass-plus" aria-hidden="true" />
        )}
      </button>

      {/* SVG Displacement Map Filter */}
      <svg
        style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}
        aria-hidden="true"
      >
        <filter
          id={filterId}
          primitiveUnits="objectBoundingBox"
          x="-15%"
          y="-15%"
          width="130%"
          height="130%"
        >
          <feImage
            href="data:image/png;base64,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32vv2v9177197/e+3z/n3399fP3f19f17/V93/1V7339/fV3/fX72t+7v79f//17/f271j/3muevf8t1b3hBALJt24/w87v+GPPzLzjvqZmg2AChvMFO/rWJ2iR17056v8u//8919/P369/33/27rqv7t9379/1179/1173/u7/vff93v3/t/bvff3//9+/v//t33fv97/ff379u//2/b6197rXPv/75NzTdBc8/QDat/0l88Z6/wuzU885z6/xS2aK9c1m9i2rX32Wf//N1d7/373+/137ve/r3vf/93/u7b/+7Pff339+/v/+udv/33z923bv1tffve2/d+/f/r97f//1v/f57t/79n9X/v3f9+9/7vff//v3rv99f//q/77/r/f/9733/+r//6//v37f/7373/v377v37fv+/f/+vfv+29+8/1/b9++//333fv97//3rf65+/+9zbn/dGFy1AZmdegLv3fQvLiy+amX/6pUXF32pT3HhH+13b/uO1ff4P//a1/75/n//e973/vf/+/e/3vf9+37/v/e/33//79//f/3//ff77e9/7//e1//7f/++3+999+/ff/33v/7/f/723e7f//b/+f//9+97b/fe/+/fve+/tf7//v9/rf379+u9f/+597/Wv/763e9f/rf99+/ff/33//ff3//5fv793vf/77723e+9//957u/e+97b/fv97v//+/vd7+/fve//v/b9/v/9/3/9//33//t/vf/3//v3/e6/7/v37f/f3/e/3ve+1d+//3/33//799+/f//v/7//f//973/vfv3//u/fve9/73/++/3f//vf7/7f/vv/3/X/3//5/v/+u/vf77/vf7/3///2+9/ve/77333tf+5+/7jWvu6AL49qA6c6h9x35SyzNn8DC2ad14LDOXbmR8W630/c/+897vf7/7e/7vv97/3d//3v/fd//7//e979/77/ve/+/v/9/v3/vvf9/7/re/33v/3ffu+/ve/d/7++97r33/e/d99/vv7/vvf/9/v/d3/f/f/9/ff/9773re//+99+7/nvf+/e977//+3vf/7/3799/f///73vf//57b/fe///33/u//973vv/v///e/959/33/vf77v/e+9///f973/v3v3vv/3//f+7/vfd9///v//vv//fve/97779f/r/f/73/379///t+/9/67/vf7f9/3f7//f///ve9/3/fe//9/r//f7/3/+/f/379v/9+/b//f//7f//v///r/77/vfd/7ve+/r733v99/v+/7ve/r3v/+e9/rv+89v/W159z7hgsCkEVd2b7t4H+A6ekXdQwE7z9V8KjUqFjNfW+/v75/v7+/r73rv+97/77vv9/3vv/+73vv+77//f99/3//3/ve7977fv//7vu+77/f9///+77v/f/f933/vf7vv/fe977vv9/33vv//rvvv/f///ve77/vfd/3f/+/3/e9/37fv/d///v/+77/ve/77v/+f/9/3/ve7/3vv///e+/9/nv///vf67//fv9//39d3/u///v///v/7/v//vf/39//v/e97///v/e+/3f/f/e9///7f//v3//rvu+//fv//t//37/v///3/u/7//ve///9/7ve/3vv//v//vv//fv+/ff//r/7/ve793vvff97/3/v//e99//ve7//vvve/37/fe/3/e+/9z3/ev0bXXDBwJcf+7M/u7Yw85xN99W/66t+/1b75l/77X/V/n3vfd//ve/7//v/vf/73/e9/77v+//7vv+/77///vd/33vfe//7fe/93/e+/33/ve/3/e///ve97/vf///fe7/3/e9/3/e9//33//t/9/3vf/++/957///fe+//vv/e/33//vd9///v3/f/7/v/vvve/997/7v3v/e//7vvfe9///v//ve97/vf//v///f9///fe//3v///ve/7///f+77v/fv/e/9733v/3/e9//9//9///t97v/f//vv//e/f97vv/d/3f/++/33fe/v/e9/73/ff+/5//3///f7/7/t+/773fv99/fv///vf+//33vf/7//fv997/9v6/177mre+/u14kw/4W3/1b/37m5994Qf9/570/zfp/z/n/0/T//+k/3/S//+c//957/9Pev9Pev/P+/+n/f/zvv/z3v/zfv8zfv8z3v/z3v8z3v+z3v+z3v9z7/9z7/9z7/937//79/8Z/tXf/VvP4E3wN/7Gv/jWv/jW//N/+L//x7//m//3b//5b//v//7//p/+9f/iv/vL//xv/9Vf/8Vf/t3/8f/xP/4r/9W//lf/+u/91b/6m7/+9/76r/7Vv/rv/uJf/ov/1t/7V//6v/uX/7N/6Nf/7P/pv/4r//B//Wf/8N/8k//kP/y3/+Wf/mP/4l/8V//4P/9v/w//zr/3b//z//r//v/+4v/ov/3v/4F/7F/+03/v//4//rf/8l/8t37jP/vf/w//kX/6//m//pf/jT/9z//v/w//1t/7u/7+f/b3//d/7+//L/6Df/hv/qP/8N/7X//Wf/pv//2/93f+o//uP/o7//v/6X/9f/wX/5ff/nf+zt/4j/7B//wP/uD/8bf/zt/5d/4Hf+vf/q3f+6N/6Hf9gd/2m3/9H/j1f+g//3P/xv/k7/yjv+W//pP/8t/5h/7j//F//3/5f/2X/8N//A//6T/3v/rn/9d/98/+v/+r//6//v3/63/+N/6Df/A//1f/z7/8N//3f+cf+y//0z/wb/1H//f/w7/3//uH/sn/9p//Z3/w7/43f/h//N//uX/r9/6rv/9f+x3/9Z/5d//t3/0P/8v//L/4X/9//4P/3B/81/8z//Zf+rf/4v/iL/yP//Wf+8//oX/sX/1z//7f/9f+2//53/urv/m//p//8X/zX/7T//i/+Yv/6r/8f//zf+y//eN/4q/+nf/F//Hf+yv/7j/4j/8N7/8F4Q=="
            x="0"
            y="0"
            width="1"
            height="1"
            result="map"
          />
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.02" result="blur" />
          <feDisplacementMap
            id="disp"
            in="blur"
            in2="map"
            scale="1"
            xChannelSelector="R"
            yChannelSelector="G"
          >
            <animate
              attributeName="scale"
              to="1.4"
              dur="0.3s"
              begin={`${btnId}.mouseover`}
              fill="freeze"
            />
            <animate
              attributeName="scale"
              to="1"
              dur="0.3s"
              begin={`${btnId}.mouseout`}
              fill="freeze"
            />
          </feDisplacementMap>
        </filter>
      </svg>
    </>
  );
}

export default IosLiquidGlassButton;
