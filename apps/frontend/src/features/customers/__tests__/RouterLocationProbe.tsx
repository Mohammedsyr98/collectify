import { useLocation } from 'react-router';

export function RouterLocationProbe() {
  const location = useLocation();

  return (
    <div data-testid="router-location">
      {location.pathname}
      {location.search}
    </div>
  );
}
