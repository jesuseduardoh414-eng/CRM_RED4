/** @type {import('tailwindcss').Config} */
export default {
  // Escanear todos los archivos React para purgar clases no usadas
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
