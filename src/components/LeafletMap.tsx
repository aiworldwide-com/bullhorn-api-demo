'use client';

import { useEffect, useState } from 'react';

// Fix for leaflet icons in Next.js
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { HeatmapLayer } from 'react-leaflet-heatmap-layer-v3';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png'
});

interface LeafletMapProps {
    geoHeatmapData: [number, number, number][];
}

// Component to handle heatmap layer after map is ready
function HeatmapWrapper({ geoHeatmapData }: { geoHeatmapData: [number, number, number][] }) {
    const map = useMap();
    const [isMapReady, setIsMapReady] = useState(false);

    useEffect(() => {
        if (map) {
            // Wait for map to be fully initialized
            const timer = setTimeout(() => {
                setIsMapReady(true);
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [map]);

    // Only render heatmap when map is ready and data exists
    if (!isMapReady || !geoHeatmapData || geoHeatmapData.length === 0) {
        return null;
    }

    try {
        return (
            <HeatmapLayer
                points={geoHeatmapData}
                longitudeExtractor={(point: [number, number, number]) => point[1]}
                latitudeExtractor={(point: [number, number, number]) => point[0]}
                intensityExtractor={(point: [number, number, number]) => point[2]}
                radius={20}
                blur={15}
                max={1.0}
                gradient={{
                    0.1: '#89BDE0',
                    0.2: '#96E3E6',
                    0.4: '#82C09A',
                    0.6: '#FCEE54',
                    0.8: '#F8B425',
                    1.0: '#F97B57'
                }}
            />
        );
    } catch (error) {
        console.error('Error rendering heatmap:', error);
        return null;
    }
}

export default function LeafletMap({ geoHeatmapData }: LeafletMapProps) {
    useEffect(() => {
        // Invalidate size when component mounts to fix display issues
        const timer = setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    return (
        <MapContainer
            center={[39.8283, -98.5795]} // Center of USA
            zoom={4}
            style={{ height: '100%', width: '100%' }}
            className='leaflet-container'>
            <TileLayer
                url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <HeatmapWrapper geoHeatmapData={geoHeatmapData} />
        </MapContainer>
    );
}
