/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#7367F0', // Mashfa Purple/Blue
                    hover: '#685DD8',
                    light: '#E9E7FD'
                },
                secondary: {
                    DEFAULT: '#A8AAAE', // Grey
                    light: '#F1F1F2'
                },
                success: {
                    DEFAULT: '#28C76F', // Green
                    light: '#DDF6E8'
                },
                danger: {
                    DEFAULT: '#EA5455', // Red
                    light: '#FCEAEA'
                },
                warning: {
                    DEFAULT: '#FF9F43', // Orange
                    light: '#FFF0E1'
                },
                info: {
                    DEFAULT: '#00CFE8', // Cyan
                    light: '#DFF7FA'
                },
                dark: {
                    DEFAULT: '#4B4B4B',
                    body: '#6E6B7B',
                    header: '#5E5873'
                },
                background: {
                    DEFAULT: '#F8F8F8', // Light grey background
                    paper: '#FFFFFF'
                }
            },
            fontFamily: {
                sans: ['Public Sans', 'Montserrat', 'sans-serif'],
            },
            boxShadow: {
                'card': '0 4px 24px 0 rgba(34, 41, 47, 0.1)',
                'card-hover': '0 6px 30px 0 rgba(34, 41, 47, 0.15)',
                'soft': '0 2px 10px 0 rgba(34, 41, 47, 0.05)'
            },
            borderRadius: {
                'xl': '10px'
            }
        },
    },
    plugins: [],
}
