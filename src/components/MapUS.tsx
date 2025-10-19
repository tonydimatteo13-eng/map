import React, { useEffect, useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { offset, shift, useFloating } from '@floating-ui/react-dom';
import type { Feature, GeoJsonProperties, Geometry } from 'geojson';
import type { StateStatus, StatusColor } from '../api/client';
import Tooltip from './Tooltip';
import topology from 'us-atlas/states-10m.json' assert { type: 'json' };
import { STATE_BY_CODE, STATE_BY_FIPS } from '../data/states';

type GeographyFeature = Feature<
  Geometry,
  GeoJsonProperties & { id?: number | string; STATEFP?: string }
>;

interface MapUSProps {
  states: Array<StateStatus & { visible: boolean }>;
  selectedState: string;
  onSelectState: (code: string) => void;
}

const fillByStatus: Record<StatusColor, string> = {
  green: '#0f8554',
  yellow: '#ffff33',
  red: '#cc3333'
};

const defaultFill = '#d1dbdd';
const highlightStroke = '#0f172a';

const MapUS: React.FC<MapUSProps> = ({ states, selectedState, onSelectState }) => {
  const statesByCode = useMemo(() => {
    const map = new Map<string, StateStatus & { visible: boolean }>();
    for (const state of states) {
      map.set(state.code, {
        ...state,
        name: state.name || STATE_BY_CODE[state.code]?.name || state.code
      });
    }
    return map;
  }, [states]);

  const [hoverCode, setHoverCode] = useState<string | null>(null);
  const [pinnedCode, setPinnedCode] = useState<string | null>(null);
  const activeCode = hoverCode ?? pinnedCode;
  const activeState = activeCode ? statesByCode.get(activeCode) : undefined;
  const { refs, floatingStyles } = useFloating({
    placement: 'top',
    open: Boolean(activeState?.visible),
    middleware: [offset(16), shift()]
  });
  const isPinnedTooltip = Boolean(
    pinnedCode &&
      (!hoverCode || hoverCode === pinnedCode) &&
      (statesByCode.get(pinnedCode)?.visible ?? false)
  );

  useEffect(() => {
    if (!pinnedCode) {
      return;
    }
    const stateData = statesByCode.get(pinnedCode);
    if (!stateData || !stateData.visible) {
      setPinnedCode(null);
    }
  }, [pinnedCode, statesByCode]);

  return (
    <div className="relative">
      <ComposableMap
        projection="geoAlbersUsa"
        projectionConfig={{ scale: 1000 }}
        className="w-full"
      >
        <Geographies geography={topology}>
          {({ geographies }: { geographies: GeographyFeature[] }) =>
            geographies.map((geo) => {
              const feature = geo as GeographyFeature;
              const rawId = feature.id ?? feature.properties?.id;
              const propertyFips =
                typeof feature.properties?.STATEFP === 'string'
                  ? feature.properties.STATEFP
                  : undefined;
              const computedId =
                typeof rawId === 'number'
                  ? rawId.toString().padStart(2, '0')
                  : typeof rawId === 'string'
                  ? rawId.padStart(2, '0')
                  : '';
              const fipsCode = propertyFips ?? computedId;
              const meta = STATE_BY_FIPS[fipsCode];
              if (!meta) {
                return null;
              }
              const stateData = statesByCode.get(meta.code);
              const isSelected = meta.code === selectedState;
              const fillColor =
                stateData && stateData.visible ? fillByStatus[stateData.status] : defaultFill;

              return (
                <Geography
                  key={meta.code}
                  geography={feature}
                  tabIndex={0}
                  role="button"
                  aria-label={`Select ${meta.name}`}
                  aria-pressed={isSelected}
                  data-state-code={meta.code}
                  onMouseEnter={(event) => {
                    if (!stateData || !stateData.visible) {
                      setHoverCode(null);
                      return;
                    }
                    refs.setReference(event.currentTarget);
                    setHoverCode(meta.code);
                  }}
                  onMouseMove={(event) => {
                    if (!stateData || !stateData.visible) {
                      setHoverCode(null);
                      return;
                    }
                    refs.setReference(event.currentTarget);
                  }}
                  onMouseLeave={() => {
                    setHoverCode(null);
                  }}
                  onFocus={(event) => {
                    if (!stateData || !stateData.visible) {
                      setHoverCode(null);
                      return;
                    }
                    refs.setReference(event.currentTarget);
                    setHoverCode(meta.code);
                  }}
                  onBlur={() => {
                    setHoverCode(null);
                  }}
                  onClick={(event) => {
                    if (stateData && stateData.visible) {
                      refs.setReference(event.currentTarget);
                      setPinnedCode(meta.code);
                    } else {
                      setPinnedCode(null);
                    }
                    onSelectState(meta.code);
                  }}
                  onKeyDown={(event: React.KeyboardEvent<SVGPathElement>) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      if (stateData && stateData.visible) {
                        refs.setReference(event.currentTarget);
                        setPinnedCode(meta.code);
                      } else {
                        setPinnedCode(null);
                      }
                      onSelectState(meta.code);
                    }
                  }}
                  style={{
                    default: {
                      fill: fillColor,
                      outline: 'none',
                      stroke: isSelected ? highlightStroke : '#ffffff',
                      strokeWidth: isSelected ? 1.5 : 0.5,
                      transition: 'fill 0.2s ease, stroke 0.2s ease'
                    },
                    hover: {
                      fill: stateData && stateData.visible ? fillByStatus[stateData.status] : '#e2e8f0',
                      outline: 'none',
                      stroke: highlightStroke,
                      strokeWidth: 1.2
                    },
                    pressed: {
                      fill: stateData && stateData.visible ? fillByStatus[stateData.status] : '#cbd5f5',
                      outline: 'none'
                    }
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      <Tooltip
        open={Boolean(activeState?.visible)}
        state={activeState ?? null}
        floatingStyles={floatingStyles}
        setFloating={refs.setFloating}
        pinned={isPinnedTooltip}
      />
    </div>
  );
};

export default MapUS;
