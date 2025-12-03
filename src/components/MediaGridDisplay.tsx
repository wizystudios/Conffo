import { useState } from 'react';
import { MediaGalleryViewer } from '@/components/MediaGalleryViewer';

interface MediaItem {
  url: string;
  type: 'image' | 'video' | 'audio';
}

interface MediaGridDisplayProps {
  media: MediaItem[];
  className?: string;
}

export function MediaGridDisplay({ media, className = '' }: MediaGridDisplayProps) {
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  if (!media || media.length === 0) return null;

  const openGallery = (index: number) => {
    setGalleryIndex(index);
    setShowGallery(true);
  };

  // Single media
  if (media.length === 1) {
    const item = media[0];
    return (
      <>
        <div 
          className={`relative w-full aspect-square bg-muted ${className}`}
          onClick={() => openGallery(0)}
        >
          {item.type === 'image' ? (
            <img
              src={item.url}
              alt="Post media"
              className="w-full h-full object-cover cursor-pointer rounded-lg"
              loading="lazy"
            />
          ) : item.type === 'video' ? (
            <video
              src={item.url}
              controls
              playsInline
              muted
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
              <audio controls src={item.url} className="max-w-full" />
            </div>
          )}
        </div>
        <MediaGalleryViewer
          media={media}
          initialIndex={galleryIndex}
          isOpen={showGallery}
          onClose={() => setShowGallery(false)}
        />
      </>
    );
  }

  // Two media - side by side
  if (media.length === 2) {
    return (
      <>
        <div className={`grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden ${className}`}>
          {media.map((item, index) => (
            <div 
              key={index}
              className="relative aspect-square cursor-pointer"
              onClick={() => openGallery(index)}
            >
              {item.type === 'image' ? (
                <img
                  src={item.url}
                  alt={`Media ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : item.type === 'video' ? (
                <div className="relative w-full h-full">
                  <video
                    src={item.url}
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <MediaGalleryViewer
          media={media}
          initialIndex={galleryIndex}
          isOpen={showGallery}
          onClose={() => setShowGallery(false)}
        />
      </>
    );
  }

  // Three media - one large, two small
  if (media.length === 3) {
    return (
      <>
        <div className={`grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden ${className}`}>
          <div 
            className="relative row-span-2 aspect-square cursor-pointer"
            onClick={() => openGallery(0)}
          >
            {media[0].type === 'image' ? (
              <img
                src={media[0].url}
                alt="Media 1"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="relative w-full h-full">
                <video src={media[0].url} muted playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-rows-2 gap-0.5">
            {media.slice(1).map((item, index) => (
              <div 
                key={index}
                className="relative aspect-video cursor-pointer"
                onClick={() => openGallery(index + 1)}
              >
                {item.type === 'image' ? (
                  <img
                    src={item.url}
                    alt={`Media ${index + 2}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="relative w-full h-full">
                    <video src={item.url} muted playsInline className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <MediaGalleryViewer
          media={media}
          initialIndex={galleryIndex}
          isOpen={showGallery}
          onClose={() => setShowGallery(false)}
        />
      </>
    );
  }

  // Four or more media - 2x2 grid with +N overlay
  return (
    <>
      <div className={`grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden ${className}`}>
        {media.slice(0, 4).map((item, index) => (
          <div 
            key={index}
            className="relative aspect-square cursor-pointer"
            onClick={() => openGallery(index)}
          >
            {item.type === 'image' ? (
              <img
                src={item.url}
                alt={`Media ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : item.type === 'video' ? (
              <div className="relative w-full h-full">
                <video src={item.url} muted playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
              </div>
            ) : null}
            
            {/* Show +N overlay on the 4th item if there are more */}
            {index === 3 && media.length > 4 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">+{media.length - 4}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <MediaGalleryViewer
        media={media}
        initialIndex={galleryIndex}
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
      />
    </>
  );
}
