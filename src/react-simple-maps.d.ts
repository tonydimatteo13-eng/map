declare module 'react-simple-maps' {
  import * as React from 'react';
  import type { Feature, FeatureCollection, Geometry } from 'geojson';
  import type { GeoProjection } from 'd3-geo';

  export interface GeographyStyle {
    default: React.CSSProperties;
    hover?: React.CSSProperties;
    pressed?: React.CSSProperties;
  }

  export interface GeographyProps {
    geography: Feature<Geometry, Record<string, unknown>>;
    projection?: GeoProjection;
    style?: GeographyStyle;
    tabIndex?: number;
    role?: string;
    'aria-label'?: string;
    'aria-pressed'?: boolean;
    onMouseEnter?: React.MouseEventHandler<SVGPathElement>;
    onMouseMove?: React.MouseEventHandler<SVGPathElement>;
    onMouseLeave?: React.MouseEventHandler<SVGPathElement>;
    onFocus?: React.FocusEventHandler<SVGPathElement>;
    onBlur?: React.FocusEventHandler<SVGPathElement>;
    onClick?: React.MouseEventHandler<SVGPathElement>;
    onKeyDown?: React.KeyboardEventHandler<SVGPathElement>;
    styleObject?: GeographyStyle;
    [key: string]: unknown;
  }

  export const ComposableMap: React.FC<{
    projection?: string;
    projectionConfig?: Record<string, unknown>;
    className?: string;
    width?: number;
    height?: number;
    children?: React.ReactNode;
  }>;

  export const Geographies: React.FC<{
    geography: string | FeatureCollection<Geometry, Record<string, unknown>> | Record<string, unknown>;
    className?: string;
    children: (props: { geographies: Feature<Geometry, Record<string, unknown>>[] }) => React.ReactNode;
  }>;

  export const Geography: React.FC<GeographyProps>;
}

declare module 'us-atlas/states-10m.json' {
  const value: Record<string, unknown>;
  export default value;
}
