import React, { useEffect, useRef, useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import "./Gallery.css";

const CANVAS_SIZE = 4000;
const CENTER = CANVAS_SIZE / 2;
const MINIMAP_SIZE = 360;
const IMG_WIDTH = 250;
const GAP = 50;

function ZoomableImage({ src, alt, origWidth, origHeight }) {
    const [position, setPosition] = useState({ x: 50, y: 50 });
    const [isZoomed, setIsZoomed] = useState(false);
    const containerRef = useRef(null);

    const handleMouseMove = (e) => {
        if (!containerRef.current) return;
        const { left, top, width, height } = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - top) / height) * 100));
        setPosition({ x, y });
    };

    const aspectRatioStyle = origWidth && origHeight ? { aspectRatio: `${origWidth} / ${origHeight}` } : {};

    return (
        <div
            className="zoom-image-container"
            ref={containerRef}
            style={aspectRatioStyle}
            onMouseEnter={() => setIsZoomed(true)}
            onMouseLeave={() => setIsZoomed(false)}
            onMouseMove={handleMouseMove}
        >
            <img
                src={src}
                alt={alt}
                className="zoomable-image"
                style={{
                    transformOrigin: `${position.x}% ${position.y}%`,
                    transform: isZoomed ? "scale(2.5)" : "scale(1)",
                }}
            />
        </div>
    );
}

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, info: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        this.setState({ info });
    }
    render() {
        if (this.state.hasError) {
            return <div style={{ padding: 50, color: 'red', zIndex: 9999, position: 'relative' }}>
                <h2>React Crashed!</h2>
                <pre>{this.state.error?.toString()}</pre>
                <pre>{this.state.info?.componentStack}</pre>
            </div>;
        }
        return this.props.children;
    }
}

export default function GalleryWrapper(props) {
    return <ErrorBoundary><App {...props} /></ErrorBoundary>;
}

function App({ projects = [] }) {
    const transformComponentRef = useRef(null);
    const [items, setItems] = useState([]);
    const [minScale, setMinScale] = useState(1);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showHint, setShowHint] = useState(false);
    const [isHintHiding, setIsHintHiding] = useState(false);
    const hintVisibleRef = useRef(false);
    const isHidingRef = useRef(false);
    const hasStartedCountdownRef = useRef(false);
    const hintTimerRef = useRef(null);
    const pointerPos = useRef({ x: 0, y: 0 });
    const viewStateRef = useRef({ positionX: 0, positionY: 0, scale: 1 });

    hintVisibleRef.current = showHint;
    isHidingRef.current = isHintHiding;
    
    // Refs for direct DOM updates (60fps performance without React re-renders)
    const minimapViewportRef = useRef(null);
    const minimapDotsRef = useRef(new Map());

    const startDismissAnimation = () => {
        if (isHidingRef.current) return;
        isHidingRef.current = true;
        setIsHintHiding(true);
        sessionStorage.setItem("hasSeenGalleryHint", "true");
        setTimeout(() => {
            setShowHint(false);
            setIsHintHiding(false);
            hintVisibleRef.current = false;
            isHidingRef.current = false;
            hasStartedCountdownRef.current = false;
        }, 600);
    };

    const handleUserInteraction = () => {
        if (!hintVisibleRef.current || isHidingRef.current || hasStartedCountdownRef.current) return;
        hasStartedCountdownRef.current = true;
        if (hintTimerRef.current) {
            clearTimeout(hintTimerRef.current);
        }
        hintTimerRef.current = setTimeout(() => {
            startDismissAnimation();
        }, 3000);
    };

    useEffect(() => {
        const hasSeen = sessionStorage.getItem("hasSeenGalleryHint");
        if (!hasSeen) {
            setShowHint(true);
            hintVisibleRef.current = true;
            hasStartedCountdownRef.current = false;
            hintTimerRef.current = setTimeout(() => {
                startDismissAnimation();
            }, 10000);
        }
        return () => {
            if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (!showHint || isHintHiding) return;

        const onUserInput = () => {
            handleUserInteraction();
        };

        window.addEventListener("pointerdown", onUserInput, { passive: true });
        window.addEventListener("wheel", onUserInput, { passive: true });
        window.addEventListener("keydown", onUserInput, { passive: true });

        return () => {
            window.removeEventListener("pointerdown", onUserInput);
            window.removeEventListener("wheel", onUserInput);
            window.removeEventListener("keydown", onUserInput);
        };
    }, [showHint, isHintHiding]);

    useEffect(() => {
        if (selectedItem) {
            document.body.classList.add("cursor-light");
            startDismissAnimation();
        } else {
            document.body.classList.remove("cursor-light");
        }
        return () => {
            document.body.classList.remove("cursor-light");
        };
    }, [selectedItem]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                setSelectedItem(null);
            }
        };
        if (selectedItem) {
            window.addEventListener("keydown", handleKeyDown);
            return () => window.removeEventListener("keydown", handleKeyDown);
        }
    }, [selectedItem]);

    useEffect(() => {
        if (!projects || projects.length === 0) return;
        const placedItems = [];
        const doesOverlap = (newItem, existingItems) => {
            for (const item of existingItems) {
                if (
                    newItem.x < item.x + item.width + GAP &&
                    newItem.x + newItem.width + GAP > item.x &&
                    newItem.y < item.y + item.height + GAP &&
                    newItem.y + newItem.height + GAP > item.y
                ) { return true; }
            }
            return false;
        };

        projects.forEach((dataItem) => {
            let validPosition = false;
            let attempts = 0;
            let x, y;
            let w = IMG_WIDTH;
            let h = Math.floor((dataItem.origHeight / dataItem.origWidth) * w);

            while (!validPosition && attempts < 150) {
                attempts++;
                const spreadX = (Math.random() + Math.random() - 1) * 900;
                const spreadY = (Math.random() + Math.random() - 1) * 900;
                x = CENTER + spreadX - (w / 2);
                y = CENTER + spreadY - (h / 2);

                if (x < 50) x = 50;
                if (y < 50) y = 50;
                if (x + w > CANVAS_SIZE - 50) x = CANVAS_SIZE - w - 50;
                if (y + h > CANVAS_SIZE - 50) y = CANVAS_SIZE - h - 50;

                if (!doesOverlap({ x, y, width: w, height: h }, placedItems)) {
                    validPosition = true;
                }
            }
            if (validPosition) {
                placedItems.push({ ...dataItem, width: w, height: h, x, y });
            }
        });
        setItems(placedItems);
    }, [projects]);

    useEffect(() => {
        const calculateBounds = () => {
            const targetVisibleWidth = CANVAS_SIZE / 2;
            const calculatedMinScale = window.innerWidth / targetVisibleWidth;
            setMinScale(calculatedMinScale);
        };
        setTimeout(calculateBounds, 100);
        window.addEventListener('resize', calculateBounds);
        return () => window.removeEventListener('resize', calculateBounds);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (selectedItem || !transformComponentRef.current) return;
            
            // Zooming
            if (e.key === '+' || e.key === '=') {
                transformComponentRef.current.zoomIn(0.5);
                return;
            }
            if (e.key === '-') {
                transformComponentRef.current.zoomOut(0.5);
                return;
            }

            // Panning
            const step = 200;
            const { positionX, positionY, scale } = viewStateRef.current;
            
            // Prevent default scrolling for arrows so the whole page doesn't jump
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }

            if (e.key === 'ArrowUp') {
                transformComponentRef.current.setTransform(positionX, positionY + step, scale, 200);
            } else if (e.key === 'ArrowDown') {
                transformComponentRef.current.setTransform(positionX, positionY - step, scale, 200);
            } else if (e.key === 'ArrowLeft') {
                transformComponentRef.current.setTransform(positionX + step, positionY, scale, 200);
            } else if (e.key === 'ArrowRight') {
                transformComponentRef.current.setTransform(positionX - step, positionY, scale, 200);
            }
        };

        window.addEventListener('keydown', handleKeyDown, { passive: false });
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedItem]);

    const handlePointerDown = (e) => {
        pointerPos.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e, item) => {
        const dx = Math.abs(e.clientX - pointerPos.current.x);
        const dy = Math.abs(e.clientY - pointerPos.current.y);

        if (dx < 5 && dy < 5) {
            e.preventDefault();
            setSelectedItem(item);
        }
    };

    const mapRatio = MINIMAP_SIZE / CANVAS_SIZE;

    const updateMinimap = (state) => {
        if (state) {
            viewStateRef.current = state;
        }
        const { positionX: x, positionY: y, scale } = viewStateRef.current;
        
        const viewportX = -x / scale;
        const viewportY = -y / scale;
        const viewportW = window.innerWidth / scale;
        const viewportH = window.innerHeight / scale;

        if (minimapViewportRef.current) {
            minimapViewportRef.current.style.transform = `translate3d(${viewportX * mapRatio}px, ${viewportY * mapRatio}px, 0)`;
            minimapViewportRef.current.style.width = `${viewportW * mapRatio}px`;
            minimapViewportRef.current.style.height = `${viewportH * mapRatio}px`;
        }

        items.forEach(item => {
            const dot = minimapDotsRef.current.get(item.id);
            if (dot) {
                const active = (
                    item.x < viewportX + viewportW &&
                    item.x + item.width > viewportX &&
                    item.y < viewportY + viewportH &&
                    item.y + item.height > viewportY
                );
                dot.style.backgroundColor = active ? '#020202' : 'transparent';
            }
        });
    };

    useEffect(() => {
        if (items.length > 0 && transformComponentRef.current) {
            updateMinimap(viewStateRef.current);
        }
    }, [items]);

    const containerRef = useRef(null);

    return (
        <div
            className="gallery-container"
            ref={containerRef}
            onPointerDown={handleUserInteraction}
            onWheel={handleUserInteraction}
        >
            {showHint && (
                <div
                    className={`gallery-onboarding-hint ${isHintHiding ? 'is-hiding' : ''}`}
                    onClick={startDismissAnimation}
                    data-cursor-hover
                >
                    <div className="hint-row">
                        <span className="hint-mouse-icon">
                            <svg width="14" height="21" viewBox="0 0 20 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="1" y="1" width="18" height="28" rx="9" stroke="currentColor" strokeWidth="1.2" />
                                <path d="M10 1C5.03 1 1 5.03 1 10H10V1Z" fill="currentColor" fillOpacity="0.4" />
                                <line x1="10" y1="1" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2" />
                                <line x1="1" y1="10" x2="19" y2="10" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
                                <g className="pan-arrows">
                                    <path d="M5 20H15M7 18L5 20L7 22M13 18L15 20L13 22" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                </g>
                            </svg>
                        </span>
                        <span className="hint-text">Maintenir le clic gauche et glisser pour se déplacer</span>
                    </div>

                    <div className="hint-row">
                        <span className="hint-mouse-icon">
                            <svg width="14" height="21" viewBox="0 0 20 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="1" y="1" width="18" height="28" rx="9" stroke="currentColor" strokeWidth="1.2" />
                                <line x1="1" y1="10" x2="19" y2="10" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
                                <line x1="10" y1="1" x2="10" y2="5" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
                                <line x1="10" y1="11" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
                                <g className="zoom-wheel">
                                    <rect x="8.5" y="5" width="3" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                                    <path d="M10 18V24M7.5 20L10 17.5L12.5 20M7.5 22L10 24.5L12.5 22" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                                </g>
                            </svg>
                        </span>
                        <span className="hint-text">Zoomer avec la molette</span>
                    </div>
                </div>
            )}
            <TransformWrapper
                ref={transformComponentRef}
                initialScale={1.0}
                minScale={minScale}
                maxScale={3}
                limitToBounds={true}
                animation={{ animationTime: 500 }}
                centerOnInit={true}
                wheel={{ step: 0.1 }}
                pinch={{ step: 5 }}
                panning={{ velocityDisabled: false, velocitySensitivity: 2 }}
                onPanningStart={() => {
                    containerRef.current?.classList.add('is-interacting');
                    handleUserInteraction();
                }}
                onPanningStop={() => containerRef.current?.classList.remove('is-interacting')}
                onZoomStart={() => {
                    containerRef.current?.classList.add('is-interacting');
                    handleUserInteraction();
                }}
                onZoomStop={() => containerRef.current?.classList.remove('is-interacting')}
                onPanning={(ref) => {
                    updateMinimap(ref.state);
                    handleUserInteraction();
                }}
                onZooming={(ref) => {
                    updateMinimap(ref.state);
                    handleUserInteraction();
                }}
                onTransformed={(ref) => updateMinimap(ref.state)}
                onInit={(ref) => updateMinimap(ref.state)}
            >
                <TransformComponent
                    wrapperStyle={{ width: "100%", height: "100%" }}
                    contentStyle={{ width: `${CANVAS_SIZE}px`, height: `${CANVAS_SIZE}px`, willChange: "transform" }}
                >
                    <div style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, position: 'relative', backgroundColor: '#F8F8F8', willChange: 'transform', transform: 'translateZ(0)' }}>
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="gallery-item group"
                                style={{
                                    left: item.x, top: item.y, width: item.width, height: item.height,
                                }}
                                tabIndex={0}
                                role="button"
                                aria-label={`Voir le projet ${item.title}`}
                                onPointerDown={handlePointerDown}
                                onPointerUp={(e) => handlePointerUp(e, item)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setSelectedItem(item);
                                    }
                                }}
                                onFocus={() => {
                                    if (transformComponentRef.current) {
                                        const { scale } = viewStateRef.current;
                                        // Center the newly focused item on screen
                                        const targetX = -(item.x + item.width / 2) * scale + window.innerWidth / 2;
                                        const targetY = -(item.y + item.height / 2) * scale + window.innerHeight / 2;
                                        transformComponentRef.current.setTransform(targetX, targetY, scale, 300);
                                    }
                                }}
                            >
                                <img src={item.src} alt={item.title} className="gallery-image" decoding="async" loading="lazy" />
                                <div className="image-overlay">
                                    <h3 className="overlay-title">{item.title}</h3>
                                    <p className="overlay-subtitle">{item.subtitle}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </TransformComponent>
            </TransformWrapper>

            {selectedItem && (
                <div
                    className="project-modal-overlay"
                    onPointerDown={() => setSelectedItem(null)}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="project-modal-content">

                        <div className="modal-left" style={{ cursor: 'auto' }}>
                            <div onPointerDown={(e) => e.stopPropagation()} className="modal-image-wrapper">
                                <ZoomableImage
                                    src={selectedItem.fullSrc || selectedItem.src}
                                    alt={selectedItem.title}
                                    origWidth={selectedItem.origWidth}
                                    origHeight={selectedItem.origHeight}
                                />
                            </div>
                        </div>

                        <div className="modal-right" style={{ cursor: 'auto' }}>

                            <div onPointerDown={(e) => e.stopPropagation()}>
                                <h2 className="modal-title">{selectedItem.title}</h2>
                                <h4 className="modal-subtitle">{selectedItem.subtitle}</h4>

                                {selectedItem.description && (
                                    <div className="modal-description">
                                        {selectedItem.description}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            )}

            <div className={`minimap-container ${selectedItem ? 'hidden' : ''}`} style={{ width: MINIMAP_SIZE, height: MINIMAP_SIZE }}>
                {items.map((item) => {
                    return (
                        <div
                            key={item.id}
                            ref={(el) => minimapDotsRef.current.set(item.id, el)}
                            className="minimap-dot"
                            style={{
                                left: item.x * mapRatio, top: item.y * mapRatio,
                                width: Math.max(2, item.width * mapRatio), height: Math.max(2, item.height * mapRatio),
                                backgroundColor: 'transparent', borderColor: '#020202',
                            }}
                        />
                    );
                })}
                <div ref={minimapViewportRef} className="minimap-viewport" />
            </div>
        </div>
    );
}