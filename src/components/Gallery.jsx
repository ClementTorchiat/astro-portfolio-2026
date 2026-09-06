import React, { useEffect, useRef, useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import "./Gallery.css";

const CANVAS_SIZE = 4000;
const CENTER = CANVAS_SIZE / 2;
const MINIMAP_SIZE = 360;
const IMG_WIDTH = 250;
const GAP = 50;

function ZoomableImage({ src, alt }) {
    const [position, setPosition] = useState({ x: 50, y: 50 });
    const [isZoomed, setIsZoomed] = useState(false);
    const containerRef = useRef(null);

    const handleMouseMove = (e) => {
        if (!containerRef.current) return;
        const { left, top, width, height } = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - left) / width) * 100;
        const y = ((e.clientY - top) / height) * 100;
        setPosition({ x, y });
    };

    return (
        <div
            className="zoom-image-container"
            ref={containerRef}
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
    const pointerPos = useRef({ x: 0, y: 0 });
    const viewStateRef = useRef({ positionX: 0, positionY: 0, scale: 1 });
    
    // Refs for direct DOM updates (60fps performance without React re-renders)
    const minimapViewportRef = useRef(null);
    const minimapDotsRef = useRef(new Map());

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
                const spreadX = (Math.random() + Math.random() - 1) * 1400;
                const spreadY = (Math.random() + Math.random() - 1) * 1400;
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
        <div className="gallery-container" ref={containerRef}>
            <TransformWrapper
                ref={transformComponentRef}
                initialScale={1.5}
                minScale={minScale}
                maxScale={3}
                limitToBounds={true}
                animation={{ animationTime: 500 }}
                centerOnInit={true}
                wheel={{ step: 0.1 }}
                pinch={{ step: 5 }}
                panning={{ velocityDisabled: false, velocitySensitivity: 2 }}
                onPanningStart={() => containerRef.current?.classList.add('is-interacting')}
                onPanningStop={() => containerRef.current?.classList.remove('is-interacting')}
                onZoomStart={() => containerRef.current?.classList.add('is-interacting')}
                onZoomStop={() => containerRef.current?.classList.remove('is-interacting')}
                onPanning={(ref) => updateMinimap(ref.state)}
                onZooming={(ref) => updateMinimap(ref.state)}
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

                            <div onPointerDown={(e) => e.stopPropagation()} style={{ width: '100%', height: '100%' }}>
                                <ZoomableImage src={selectedItem.fullSrc || selectedItem.src} alt={selectedItem.title} />
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