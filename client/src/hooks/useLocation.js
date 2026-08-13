import { useState, useEffect, useCallback } from 'react';
import api from '../api.js';

export const useLocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  const updateLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lng: longitude });

        try {
          await api.post('/users/location', { lat: latitude, lng: longitude });
        } catch (err) {
          console.error('Failed to update location:', err);
        }
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    updateLocation();
    const interval = setInterval(updateLocation, 30000);
    return () => clearInterval(interval);
  }, [updateLocation]);

  return { location, error, updateLocation };
};
