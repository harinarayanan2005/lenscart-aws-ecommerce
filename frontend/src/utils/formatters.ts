export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(isoString: string): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatSpecLabel(key: string): string {
  const customLabels: Record<string, string> = {
    sensor_type: 'Sensor Format',
    megapixels: 'Effective Resolution (MP)',
    lens_mount: 'Lens Mount',
    iso_range: 'ISO Sensitivity Range',
    max_video_resolution: 'Max Video Resolution',
    autofocus_points: 'Autofocus Points',
    in_body_stabilization: 'In-Body Stabilization (IBIS)',
    weather_sealed: 'Weather Sealing',
    continuous_shooting_fps: 'Continuous Shooting (FPS)',
    focal_length_mm: 'Focal Length',
    focal_type: 'Lens Type',
    max_aperture: 'Maximum Aperture',
    min_aperture: 'Minimum Aperture',
    optical_stabilization: 'Optical Stabilization (OIS)',
    filter_thread_mm: 'Filter Thread Size (mm)',
    min_focus_distance_cm: 'Min Focus Distance (cm)',
    full_frame_compatible: 'Full-Frame Coverage',
    equipment_type: 'Support Type',
    material: 'Construction Material',
    max_payload_kg: 'Max Payload Capacity (kg)',
    max_height_cm: 'Maximum Height (cm)',
    folded_length_cm: 'Folded Length (cm)',
    head_type: 'Included Head Type',
    quick_release_plate: 'Quick Release System',
    light_type: 'Fixture Type',
    power_output_watts: 'Output Power (W)',
    color_temperature_kelvin: 'Color Temperature (K)',
    cri_rating: 'CRI Accuracy Rating',
    tlci_rating: 'TLCI Television Rating',
    mount_type: 'Modifier Mount',
    battery_option: 'Battery Support',
    microphone_type: 'Transducer / Mic Type',
    polar_pattern: 'Polar Pattern',
    frequency_response: 'Frequency Response',
    connectivity: 'Output Connectivity',
    card_type: 'Media Format',
    capacity_gb: 'Storage Capacity (GB)',
    read_speed_mbps: 'Max Read Speed (MB/s)',
    write_speed_mbps: 'Max Write Speed (MB/s)',
    video_speed_class: 'Video Speed Rating',
    interior_dimensions_cm: 'Interior Dimensions',
    laptop_compartment_inch: 'Laptop Sleeve Size (in)',
    weight_grams: 'Weight (g)',
  };

  if (customLabels[key]) return customLabels[key];
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatSpecValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

