import React, { useEffect, useRef, useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import "./Gallery.css";

// --- CONFIGURATION ---
const CANVAS_SIZE = 4000;
const CENTER = CANVAS_SIZE / 2;
const MINIMAP_SIZE = 360;
const IMG_WIDTH = 250;
const GAP = 50;

// --- 1. FAUSSES DONNÉES AVEC TITRES ---
// Au lieu d'une simple liste de nombres, on crée des objets avec des titres.
const mockData = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    title: `Projet Photographique N°${i + 1}`, // Exemple de titre
    subtitle: "Direction Artistique" // Optionnel, pour faire joli
}));


export default function App() {
    const transformComponentRef = useRef(null);
    const [items, setItems] = useState([]);
    const [viewState, setViewState] = useState({ x: 0, y: 0, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [minScale, setMinScale] = useState(1);

    // --- ALGO PLACEMENT (Inchangé) ---
    useEffect(() => {
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

        // On itère sur nos vraies données maintenant
        mockData.forEach((dataItem) => {
            let validPosition = false;
            let attempts = 0;
            let x, y, w, h;
            w = IMG_WIDTH;
            h = Math.floor(Math.random() * (400 - 150) + 150);

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
                placedItems.push({
                    ...dataItem, // On garde l'ID et le Titre
                    src: `https://picsum.photos/${w}/${h}?random=${dataItem.id}`,
                    width: w,
                    height: h,
                    x,
                    y
                });
            }
        });
        setItems(placedItems);
    }, []);

    // --- ZOOM LIMIT ---
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

    const handleImageClick = (e, index) => {
        if (isDragging) { e.preventDefault(); return; }
        console.log("Nav vers", index);
    };

    // --- CALCULS MINIMAP & VISIBILITÉ ---
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
                onPanningStart={() => setIsDragging(true)}
                onPanningStop={() => setTimeout(() => setIsDragging(false), 50)}

                onPanning={(ref) => setViewState({ x: ref.state.positionX, y: ref.state.positionY, scale: ref.state.scale })}
                onZooming={(ref) => setViewState({ x: ref.state.positionX, y: ref.state.positionY, scale: ref.state.scale })}
                onTransformed={(ref) => {
                    console.log("Transformation en cours !", ref.state.scale);
                    setViewState({ x: ref.state.positionX, y: ref.state.positionY, scale: ref.state.scale });
                }}
            >
                <TransformComponent
                    wrapperStyle={{ width: "100%", height: "100%" }}
                    contentStyle={{ width: `${CANVAS_SIZE}px`, height: `${CANVAS_SIZE}px` }}
                >
                    <div style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, position: 'relative', backgroundColor: '#F8F8F8' }}>

                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="gallery-item group" // Ajout de 'group' si on utilisait tailwind, inutile ici mais bonne pratique
                                style={{
                                    left: item.x,
                                    top: item.y,
                                    width: item.width,
                                    height: item.height,
                                }}
                                onMouseUp={(e) => handleImageClick(e, item.id)}
                            >
                                <img src={item.src} alt={item.title} className="gallery-image" />

                                {/* --- 2. NOUVELLE STRUCTURE OVERLAY --- */}
                                <div className="image-overlay">
                                    <h3 className="overlay-title">{item.title}</h3>
                                    {/* Petit sous-titre optionnel */}
                                    <p className="overlay-subtitle">{item.subtitle}</p>
                                </div>

                            </div>
                        ))}
                    </div>
                </TransformComponent>
            </TransformWrapper>

            {/* Minimap (Inchangée) */}
            <div
                className="minimap-container"
                style={{ width: MINIMAP_SIZE, height: MINIMAP_SIZE }}
            >
                {items.map((item) => {
                    const active = isItemVisible(item);
                    return (
                        <div
                            key={item.id}
                            className="minimap-dot"
                            style={{
                                left: item.x * mapRatio,
                                top: item.y * mapRatio,
                                width: Math.max(2, item.width * mapRatio),
                                height: Math.max(2, item.height * mapRatio),
                                backgroundColor: active ? '#020202' : 'transparent',
                                borderColor: '#020202',
                            }}
                        />
                    );
                })}
                <div
                    className="minimap-viewport"
                    style={{
                        width: miniViewWidth,
                        height: miniViewHeight,
                        transform: `translate3d(${miniViewX}px, ${miniViewY}px, 0)`,
                    }}
                />
            </div>
        </div>
    );
}