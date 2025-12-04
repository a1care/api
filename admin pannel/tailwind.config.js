/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                medical: {
                    primary: '#0F766E', // Deep Teal
                    secondary: '#475569', // Slate Blue
                    accent: '#06B6D4', // Cyan
                    surface: '#FFFFFF',
                    background: '#F8FAFC', // Very light slate
                    text: '#1E293B', // Slate 800
                    muted: '#64748B', // Slate 500
                },
                primary: '#0F766E', // Mapping to medical primary for compatibility
                secondary: '#475569',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'medical': '0 4px 6px -1px rgba(15, 118, 110, 0.1), 0 2px 4px -1px rgba(15, 118, 110, 0.06)',
                'medical-lg': '0 10px 15px -3px rgba(15, 118, 110, 0.1), 0 4px 6px -2px rgba(15, 118, 110, 0.05)',
            }
        },
    },
    plugins: [],
}
