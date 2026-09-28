declare module "@turf/turf" {
  export function point(coordinates: [number, number], properties?: any): any;
  export function lineString(coordinates: [number, number][], properties?: any): any;
  export function distance(from: any, to: any, options?: { units?: string }): number;
  export function buffer(geojson: any, distance: number, options?: { units?: string }): any;
}
