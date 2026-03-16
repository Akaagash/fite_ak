import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface JobPin {
  lat: number
  lng: number
  price: string
  icon: string
  isActive?: boolean
  variant?: 'job' | 'worker'
}

interface JobMapProps {
  center?: [number, number]
  zoom?: number
  jobs: JobPin[]
  onPinClick?: (job: JobPin) => void
  showControls?: boolean
}

export default function JobMap({ center, zoom = 13, jobs, onPinClick, showControls = true }: JobMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>(center || [12.9716, 77.5946]) // Default to Bangalore

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: [number, number] = [position.coords.latitude, position.coords.longitude]
          setUserLocation(location)
          if (!center) {
            setMapCenter(location)
          }
        },
        (error) => {
          console.log('Location access denied or unavailable:', error)
        }
      )
    }
  }, [center])

  useEffect(() => {
    if (center) {
      setMapCenter(center)
    }
  }, [center])

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center: mapCenter,
      zoom,
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: true,
      zoomAnimation: true,
      markerZoomAnimation: true,
      preferCanvas: false,
      keyboard: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      touchZoom: true,
      dragging: true,
      inertia: true,
      inertiaDeceleration: 3200,
      inertiaMaxSpeed: 1400,
      worldCopyJump: false,
    })

    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    const tilePane = map.getPanes().tilePane
    if (tilePane) {
      tilePane.style.filter = 'brightness(1.08) contrast(1.12) saturate(1.15) hue-rotate(-2deg)'
    }

    mapInstanceRef.current = map
  }, [mapCenter, zoom])

  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Keep map centered when center/zoom updates
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(mapCenter, zoom, { animate: true })
    }
  }, [mapCenter, zoom])

  // Update markers without recreating map
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    if (userLocation) {
      const userIconHtml = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-10 h-10 bg-blue-500/15 rounded-full animate-ping"></div>
          <div class="relative w-3.5 h-3.5 bg-white rounded-full shadow ring-4 ring-blue-500/60"></div>
        </div>
      `

      const userIcon = L.divIcon({
        html: userIconHtml,
        className: 'user-location-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      })

      const userMarker = L.marker(userLocation, { icon: userIcon }).addTo(map)
      userMarker.bindPopup('<div class="text-sm font-semibold">You are here</div>')
      markersRef.current.push(userMarker)
    }

    jobs.forEach((job) => {
      const isPrimary = job.isActive ?? false
      const isWorker = job.variant === 'worker'
      const iconHtml = `
        <div class="flex flex-col items-center gap-1">
          <div class="relative flex items-center justify-center ${isPrimary ? 'w-11 h-11' : 'w-9 h-9'} rounded-full ${isWorker ? 'bg-sky-600' : 'bg-emerald-600'} shadow-[0_12px_30px_rgba(0,0,0,0.2)] border-2 border-white">
            <div class="absolute inset-0 rounded-full ${isPrimary ? 'bg-emerald-500/25' : 'bg-sky-500/20'} blur-sm"></div>
            <span class="relative text-white text-sm font-bold">${isWorker ? '•' : job.icon}</span>
          </div>
          ${isPrimary && job.price ? `<div class="px-2 py-1 text-[11px] font-semibold text-emerald-900 bg-white rounded-full shadow border border-emerald-100">${job.price}</div>` : ''}
        </div>
      `

      const icon = L.divIcon({
        html: iconHtml,
        className: 'custom-job-marker',
        iconSize: [48, isPrimary && job.price ? 64 : 44],
        iconAnchor: [24, isPrimary && job.price ? 50 : 24],
      })

      const marker = L.marker([job.lat, job.lng], { icon }).addTo(map)

      // Add tooltips for location labels
      const locationLabel = isWorker ? 'Worker Current Location' : 'Job Posted Location'
      marker.bindTooltip(locationLabel, {
        permanent: false,
        direction: 'top',
        offset: [0, -20],
        className: 'custom-tooltip',
      })

      // Add popup with more details
      const popupContent = isWorker 
        ? `<div class="text-sm"><strong>Worker Location</strong><br/>Current position</div>`
        : `<div class="text-sm"><strong>Job Site</strong><br/>Posted at this location${job.price ? `<br/><strong>${job.price}</strong>` : ''}</div>`
      marker.bindPopup(popupContent)

      if (onPinClick) {
        marker.on('click', () => onPinClick(job))
      }
      
      markersRef.current.push(marker)
    })
  }, [jobs, onPinClick, userLocation])

  const handleZoom = (direction: 'in' | 'out') => {
    const map = mapInstanceRef.current
    if (!map) return
    direction === 'in' ? map.zoomIn() : map.zoomOut()
  }

  const handleLocate = () => {
    const map = mapInstanceRef.current
    if (!map || !userLocation) return
    map.flyTo(userLocation, Math.max(map.getZoom(), 15), { duration: 0.6 })
  }

  const handleResetCenter = () => {
    const map = mapInstanceRef.current
    if (!map) return
    map.flyTo(mapCenter, zoom, { duration: 0.6 })
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl shadow-lg bg-white">
      <div 
        ref={mapRef} 
        className="absolute inset-0 z-0"
        style={{ 
          background: '#f3f4f6',
        }}
      />

      {showControls && (
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
          <button onClick={() => handleZoom('in')} className="w-11 h-11 rounded-xl bg-white shadow-md border border-black/5 flex items-center justify-center hover:shadow-lg transition" aria-label="Zoom in">
            <span className="text-lg font-bold text-slate-700">+</span>
          </button>
          <button onClick={() => handleZoom('out')} className="w-11 h-11 rounded-xl bg-white shadow-md border border-black/5 flex items-center justify-center hover:shadow-lg transition" aria-label="Zoom out">
            <span className="text-lg font-bold text-slate-700">-</span>
          </button>
          <button onClick={handleLocate} className="w-11 h-11 rounded-xl bg-white shadow-md border border-black/5 flex items-center justify-center hover:shadow-lg transition" title="My location" aria-label="Locate me">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3" />
              <path d="M12 19v3" />
              <path d="M5 12H2" />
              <path d="M22 12h-3" />
            </svg>
          </button>
          <button onClick={handleResetCenter} className="w-11 h-11 rounded-xl bg-white shadow-md border border-black/5 flex items-center justify-center hover:shadow-lg transition" title="Reset view" aria-label="Reset view">
            <span className="text-sm font-semibold text-slate-700">⟳</span>
          </button>
        </div>
      )}
    </div>
  )
}
