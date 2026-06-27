// lib/geo/utils.ts — Geospatial utilities

import * as THREE from 'three';

/**
 * Converts lat/lng to a 3D position on a unit sphere.
 * Normalizes longitude to prevent particle teleporting at ±180° boundary.
 */
export function latLngToVector3(lat: number, lng: number, radius = 1.02): THREE.Vector3 {
  const normalizedLng = ((lng + 180) % 360) - 180;
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (normalizedLng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/**
 * Snaps coordinates to ~500m grid (client-side fuzzing).
 * Server-side fuzzing via ST_SnapToGrid is authoritative.
 * This provides UI-level consistency.
 */
export function fuzzCoordinates(lat: number, lng: number): { lat: number; lng: number } {
  const GRID_SIZE = 0.005; // ~500m
  return {
    lat: Math.round(lat / GRID_SIZE) * GRID_SIZE,
    lng: Math.round(lng / GRID_SIZE) * GRID_SIZE,
  };
}

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
