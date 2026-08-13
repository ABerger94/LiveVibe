import { useState, useRef } from 'react';

const navButtonStyle = (side) => ({
  position: 'absolute',
  top: '50%',
  [side]: '8px',
  transform: 'translateY(-50%)',
  width: '30px',
  height: '30px',
  borderRadius: '50%',
  background: 'rgba(0,0,0,0.5)',
  border: 'none',
  color: '#fff',
  fontSize: '18px',
  lineHeight: 1,
  cursor: 'pointer'
});

// Swipeable/clickable image carousel. `photos` is an array of either
// {id, url} objects or plain URL strings.
export const PhotoGallery = ({ photos, height = '240px' }) => {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(null);

  if (!photos || photos.length === 0) return null;

  const goTo = (i) => setIndex((i + photos.length) % photos.length);
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > 50) prev();
    else if (delta < -50) next();
    touchStartX.current = null;
  };

  return (
    <div
      style={{ position: 'relative', width: '100%', height, overflow: 'hidden', background: '#0f0f23' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        transform: `translateX(-${index * 100}%)`,
        transition: 'transform 0.25s ease'
      }}>
        {photos.map((photo, i) => (
          <img
            key={photo.id || i}
            src={photo.url || photo}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', flexShrink: 0 }}
          />
        ))}
      </div>

      {photos.length > 1 && (
        <>
          <button onClick={prev} style={navButtonStyle('left')} aria-label="Previous photo">‹</button>
          <button onClick={next} style={navButtonStyle('right')} aria-label="Next photo">›</button>
          <div style={{ position: 'absolute', bottom: '10px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '6px' }}>
            {photos.map((_, i) => (
              <div
                key={i}
                onClick={() => goTo(i)}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: i === index ? '#fff' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
