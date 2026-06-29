/**
 * Minimal ambient typings for the Google Maps JavaScript API (Phase 11).
 *
 * The website loads Maps JS at runtime via a `<script>` tag (`lib/maps/loader.ts`)
 * rather than the `@react-google-maps/api` wrapper — the TODO explicitly allows
 * "(or Maps JS)", and this keeps the monorepo off another dependency. We only
 * declare the slice of the API the map components actually touch (Map, classic
 * Marker, Circle, bounds/points). Everything is intentionally narrow; widen as
 * new surface is used.
 */
declare namespace google.maps {
  interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
  }

  type LatLngInput = LatLng | LatLngLiteral;

  class LatLngBounds {
    constructor(sw?: LatLngInput, ne?: LatLngInput);
    extend(point: LatLngInput): LatLngBounds;
    getCenter(): LatLng;
    isEmpty(): boolean;
  }

  class Size {
    constructor(width: number, height: number);
  }

  class Point {
    constructor(x: number, y: number);
  }

  interface Icon {
    url: string;
    scaledSize?: Size;
    size?: Size;
    anchor?: Point;
    labelOrigin?: Point;
  }

  interface Padding {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  }

  interface MapsEventListener {
    remove(): void;
  }

  interface MapMouseEvent {
    latLng?: LatLng | null;
  }

  interface MapOptions {
    center?: LatLngInput;
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
    zoomControl?: boolean;
    rotateControl?: boolean;
    scaleControl?: boolean;
    clickableIcons?: boolean;
    disableDefaultUI?: boolean;
    gestureHandling?: 'cooperative' | 'greedy' | 'none' | 'auto';
    backgroundColor?: string;
    mapId?: string;
    styles?: unknown[];
  }

  class Map {
    constructor(element: HTMLElement, options?: MapOptions);
    addListener(eventName: string, handler: (event?: MapMouseEvent) => void): MapsEventListener;
    getZoom(): number | undefined;
    setZoom(zoom: number): void;
    getBounds(): LatLngBounds | undefined;
    getCenter(): LatLng | undefined;
    fitBounds(bounds: LatLngBounds, padding?: number | Padding): void;
    panTo(latLng: LatLngInput): void;
    setCenter(latLng: LatLngInput): void;
    setOptions(options: MapOptions): void;
  }

  interface MarkerLabel {
    text: string;
    color?: string;
    fontSize?: string;
    fontWeight?: string;
  }

  interface MarkerOptions {
    position?: LatLngInput;
    map?: Map | null;
    icon?: Icon | string;
    title?: string;
    label?: string | MarkerLabel;
    zIndex?: number;
    draggable?: boolean;
    cursor?: string;
    optimized?: boolean;
  }

  class Marker {
    constructor(options?: MarkerOptions);
    addListener(eventName: string, handler: (event?: MapMouseEvent) => void): MapsEventListener;
    setMap(map: Map | null): void;
    setPosition(latLng: LatLngInput): void;
    getPosition(): LatLng | undefined;
  }

  interface CircleOptions {
    center?: LatLngInput;
    radius?: number;
    map?: Map | null;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
    fillColor?: string;
    fillOpacity?: number;
    clickable?: boolean;
    zIndex?: number;
  }

  class Circle {
    constructor(options?: CircleOptions);
    setMap(map: Map | null): void;
    getBounds(): LatLngBounds | undefined;
  }

  namespace event {
    function clearInstanceListeners(instance: object): void;
  }
}

interface Window {
  __collablyOnMapsReady?: () => void;
}
