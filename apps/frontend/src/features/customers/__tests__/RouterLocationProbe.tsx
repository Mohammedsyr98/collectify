import { useLocation, useNavigate } from 'react-router';

export function RouterLocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <div data-testid="router-location">
        {location.pathname}
        {location.search}
      </div>
      <button aria-label="Go back" onClick={() => navigate(-1)} type="button" />
    </>
  );
}
