import { useEffect, useRef, useState } from "react";

import { calculateMileageRoute, type MileageRouteResult } from "./api";

function postcodeLooksComplete(value: string): boolean {
  return /^(GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})$/i.test(value.trim());
}

function routeKey(start: string, end: string): string {
  return `${start.toUpperCase().replace(/\s/g, "")}→${end.toUpperCase().replace(/\s/g, "")}`;
}

export function MileageRoutePicker({
  token,
  startPostcode,
  endPostcode,
  totalMiles,
  onSelect,
  disabled = false,
  autoCalculate = false,
}: {
  token: string;
  startPostcode: string;
  endPostcode: string;
  totalMiles: number | string | null;
  onSelect: (miles: number, startPostcode: string, endPostcode: string) => void;
  disabled?: boolean;
  autoCalculate?: boolean;
}) {
  const [result, setResult] = useState<MileageRouteResult | null>(null);
  const [calculatedKey, setCalculatedKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const currentKey = routeKey(startPostcode, endPostcode);
  const valid = postcodeLooksComplete(startPostcode) && postcodeLooksComplete(endPostcode) &&
    startPostcode.toUpperCase().replace(/\s/g, "") !== endPostcode.toUpperCase().replace(/\s/g, "");
  const currentResult = calculatedKey === currentKey ? result : null;

  const calculate = async (start = startPostcode, end = endPostcode) => {
    const id = ++requestId.current;
    setBusy(true);
    setError(null);
    try {
      const next = await calculateMileageRoute(token, start, end);
      if (id !== requestId.current) return;
      setResult(next);
      setCalculatedKey(routeKey(next.startPostcode, next.endPostcode));
      setSelectedIndex(0);
      onSelect(next.routes[0].miles, next.startPostcode, next.endPostcode);
    } catch (routeError) {
      if (id !== requestId.current) return;
      setError(routeError instanceof Error ? routeError.message : "Could not calculate the road distance. Enter the mileage manually.");
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  };

  useEffect(() => {
    if (!autoCalculate || disabled || !valid || currentResult || busy || error) return;
    const timer = window.setTimeout(() => void calculate(), 900);
    return () => window.clearTimeout(timer);
    // Calculate only when the completed postcode pair changes.
  }, [autoCalculate, currentKey, valid, disabled, currentResult, busy, error]);

  useEffect(() => {
    requestId.current += 1;
    setError(null);
    setBusy(false);
  }, [currentKey]);

  return (
    <div className="mileage-route-picker form-span-2">
      <div className="mileage-route-heading">
        <div>
          <strong>Road-route mileage</strong>
          <p>Exdox calculates driving miles between the postcodes. Choose an alternative if it matches your journey better.</p>
        </div>
        <button className="secondary-action" type="button" disabled={disabled || !valid || busy} onClick={() => void calculate()}>
          {busy ? "Calculating…" : currentResult ? "Recalculate route" : "Calculate road miles"}
        </button>
      </div>
      {error ? <p className="field-hint mileage-route-error" role="alert">{error}</p> : null}
      {currentResult ? (
        <>
          <div className="mileage-route-options" role="group" aria-label="Driving routes">
            {currentResult.routes.map((route, index) => (
              <button
                className={`mileage-route-option${selectedIndex === index ? " selected" : ""}`}
                key={`${index}-${route.miles}`}
                type="button"
                disabled={disabled}
                aria-pressed={selectedIndex === index}
                onClick={() => { setSelectedIndex(index); onSelect(route.miles, currentResult.startPostcode, currentResult.endPostcode); }}
              >
                <strong>{index === 0 ? "Suggested route" : `Alternative ${index}`}: {route.miles.toFixed(1)} miles</strong>
                <span>About {route.durationMinutes} min{route.via.length ? ` · Main roads: ${route.via.join(", ")}` : ""}</span>
              </button>
            ))}
          </div>
          {currentResult.routes[selectedIndex]?.mapImage ? (
            <img
              className="mileage-route-map"
              src={currentResult.routes[selectedIndex].mapImage}
              alt={`Driving route from ${currentResult.startPostcode} to ${currentResult.endPostcode}`}
            />
          ) : null}
          {Number(totalMiles) !== currentResult.routes[selectedIndex]?.miles ? <p className="field-hint">Total miles has been adjusted manually.</p> : null}
          <p className="field-hint">Calculated from postcode centres; check the route and adjust Total miles if your actual journey differed. Map data © <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noreferrer">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>.</p>
        </>
      ) : !error && valid && !busy && !autoCalculate ? <p className="field-hint">Calculate the route to fill in Total miles, or enter the distance yourself.</p> : null}
    </div>
  );
}
