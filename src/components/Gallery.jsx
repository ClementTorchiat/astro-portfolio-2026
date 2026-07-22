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

export default function App({ projects = [] }) {
    const transformComponentRef = useRef(null);
    const [items, setItems] = useState([]);
    const [viewState, setViewState] = useState({ x: 0, y: 0, scale: 1 });
    const [minScale, setMinScale] = useState(1);
    const [selectedItem, setSelectedItem] = useState(null);
    const pointerPos = useRef({ x: 0, y: 0 });

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
    const miniViewX = (-viewState.x / viewState.scale) * mapRatio;
    const miniViewY = (-viewState.y / viewState.scale) * mapRatio;
    const miniViewWidth = (window.innerWidth / viewState.scale) * mapRatio;
    const miniViewHeight = (window.innerHeight / viewState.scale) * mapRatio;

    const isItemVisible = (item) => {
        const viewportX = -viewState.x / viewState.scale;
        const viewportY = -viewState.y / viewState.scale;
        const viewportW = window.innerWidth / viewState.scale;
        const viewportH = window.innerHeight / viewState.scale;
        return (
            item.x < viewportX + viewportW &&
            item.x + item.width > viewportX &&
            item.y < viewportY + viewportH &&
            item.y + item.height > viewportY
        );
    };

    return (
        <div className="gallery-container">
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
                onPanning={(ref) => setViewState({ x: ref.state.positionX, y: ref.state.positionY, scale: ref.state.scale })}
                onZooming={(ref) => setViewState({ x: ref.state.positionX, y: ref.state.positionY, scale: ref.state.scale })}
                onTransformed={(ref) => setViewState({ x: ref.state.positionX, y: ref.state.positionY, scale: ref.state.scale })}
            >
                <TransformComponent
                    wrapperStyle={{ width: "100%", height: "100%" }}
                    contentStyle={{ width: `${CANVAS_SIZE}px`, height: `${CANVAS_SIZE}px` }}
                >
                    <div style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, position: 'relative', backgroundColor: '#F8F8F8' }}>
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="gallery-item group"
                                style={{
                                    left: item.x, top: item.y, width: item.width, height: item.height,
                                }}
                                onPointerDown={handlePointerDown}
                                onPointerUp={(e) => handlePointerUp(e, item)}
                            >
                                <img src={item.src} alt={item.title} className="gallery-image" />
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
                                <ZoomableImage src={selectedItem.src} alt={selectedItem.title} />
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
                    const active = isItemVisible(item);
                    return (
                        <div
                            key={item.id}
                            className="minimap-dot"
                            style={{
                                left: item.x * mapRatio, top: item.y * mapRatio,
                                width: Math.max(2, item.width * mapRatio), height: Math.max(2, item.height * mapRatio),
                                backgroundColor: active ? '#020202' : 'transparent', borderColor: '#020202',
                            }}
                        />
                    );
                })}
                <div className="minimap-viewport" style={{
                    width: miniViewWidth, height: miniViewHeight,
                    transform: `translate3d(${miniViewX}px, ${miniViewY}px, 0)`,
                }}
                />
            </div>
        </div>
    );
}