import React, { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { offset, shift, useFloating } from '@floating-ui/react-dom';
import type { StateStatus, StatusColor } from '../api/client';
import Tooltip from './Tooltip';
import topology from 'us-atlas/states-10m.json' assert { type: 'json' };
import { STATE_BY_CODE, STATE_BY_FIPS } from '../data/states';

type MapState = (StateStatus & { visible: boolean }) | undefined;

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

  const [hoverState, setHoverState] = useState<MapState>(undefined);
  const { refs, floatingStyles } = useFloating({
    placement: 'top',
    open: Boolean(hoverState),
    middleware: [offset(16), shift()]
  });

  const handleStateEnter = (
    code: string,
    event: React.MouseEvent<SVGPathElement, MouseEvent>,
    stateData: MapState
  ) => {
    if (!stateData) {
      setHoverState(undefined);
      return;
    }
    refs.setReference(event.currentTarget);
    setHoverState(stateData);
  };

  const handleStateLeave = () => {
    setHoverState(undefined);
  };

  return (
    <div className="relative">
      <ComposableMap
        projection="geoAlbersUsa"
        projectionConfig={{ scale: 1000 }}
        className="w-full"
      >
        <Geographies geography={topology}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const fipsCode = typeof geo.id === 'number' ? geo.id.toString().padStart(2, '0') : geo.id;
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
                  geography={geo}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  onMouseEnter={(event) => handleStateEnter(meta.code, event, stateData)}
                  onMouseMove={(event) => handleStateEnter(meta.code, event, stateData)}
                  onMouseLeave={handleStateLeave}
                  onFocus={(event) => {
                    refs.setReference(event.currentTarget);
                    setHoverState(stateData);
                  }}
                  onBlur={handleStateLeave}
                  onClick={() => onSelectState(meta.code)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
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
        open={Boolean(hoverState)}
        state={hoverState ?? null}
        floatingStyles={floatingStyles}
        setFloating={refs.setFloating}
      />
    </div>
  );
};

export default MapUS;
