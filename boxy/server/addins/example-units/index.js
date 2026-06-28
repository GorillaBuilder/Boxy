// Example Boxy addin. Drop a folder under server/addins/<id>/ with this shape and it loads
// at server boot. The tools register under "<id>.<toolname>" in the MCP manifest.
//
// To create your own addin:
//   server/addins/my-addin/index.js   (this file)
//   server/addins/my-addin/panel.html (optional UI panel iframe content)

export default {
  id: 'example-units',
  name: 'Units & Cost Estimator',

  // Optional UI panel — the client will offer to mount it in the design page sidebar.
  // Set panel.url to a path that resolves to an HTML page served by your server (or external).
  panel: { url: '/addins/example-units/panel.html', title: 'Cost', icon: '$' },

  tools: [
    {
      name: 'estimate_volume',
      description: 'Estimate part volume (cm³) from a bounding box in millimetres.',
      input: { type: 'object', required: ['size_mm'], properties: {
        size_mm: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
      } },
      run: async ({ params }) => {
        const [x, y, z] = params.size_mm;
        const vol_cm3 = (x * y * z) / 1000;
        return { volume_cm3: +vol_cm3.toFixed(2) };
      },
    },
    {
      name: 'estimate_pla_cost',
      description: 'Estimate PLA print cost given volume in cm³ and an infill fraction.',
      input: { type: 'object', required: ['volume_cm3'], properties: {
        volume_cm3: { type: 'number' },
        infill: { type: 'number', default: 0.2 },
        price_per_kg_usd: { type: 'number', default: 22 },
      } },
      run: async ({ params }) => {
        const density = 1.24; // g/cm³ for PLA
        const grams = params.volume_cm3 * density * (params.infill ?? 0.2);
        const usd = (grams / 1000) * (params.price_per_kg_usd ?? 22);
        return { grams: +grams.toFixed(1), usd: +usd.toFixed(2) };
      },
    },
  ],
};
