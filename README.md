# 📊 EDAPro: Sistema de Análisis Exploratorio de Datos

**EDAPro** es una herramienta web de **Análisis Exploratorio de Datos (EDA)** totalmente gratuita y del lado del cliente. Diseñada para la comunidad de los datos, que permite procesar archivos CSV de forma instantánea, generando visualizaciones interactivas y reportes estadísticos profundos sin subir tus datos a ningún servidor.

## ✨ Características principales

El sistema realiza un flujo de trabajo de **14 pasos de análisis**:

1.  **Carga inteligente**: Soporte para CSV, TSV y TXT con detección automática de delimitadores.
2.  **Estructura y dimensiones**: Resumen de filas, columnas y uso de memoria estimado.
3.  **Clasificación de variables**: Identificación automática de tipos numéricos, categóricos, booleanos y fechas.
4.  **Análisis de datos faltantes**: Detección de nulos con métricas de completitud.
5.  **Estadística descriptiva**: Cálculo de media, desviación estándar, cuantiles, asimetría (skewness) y curtosis.
6.  **Análisis univariado**: Histogramas dinámicos y distribución de frecuencias.
7.  **Detección de Outliers**: Identificación de valores atípicos mediante el método de Rango Intercuartílico (IQR).
8.  **Análisis bivariado**: Exploración de relaciones mediante diagramas de dispersión con muestreo determinista.
9.  **Matriz de correlación**: Mapa de calor interactivo con cálculo de coeficientes de Pearson.
10. **Visualizaciones clave**: Gráficos premium optimizados para la toma de decisiones.
11. **Detección de duplicados**: Identificación de filas idénticas y duplicados parciales.
12. **Evaluación de calidad**: Puntaje (Score) de calidad basado en criterios de consistencia y balance.
13. **Generación de hallazgos**: Motor inteligente que resume los descubrimientos más importantes.
14. **Hoja de ruta (Next Steps)**: Recomendaciones automáticas para limpieza, feature engineering y modelado.

## 🚀 Tecnologías utilizadas

-   **Core**: HTML5 Semántico y JavaScript ES6+.
-   **Estilos**: CSS3 con diseño *Premium Dark Mode*, animaciones de micro-interacción y layouts responsivos.
-   **Visualización**: [Chart.js](https://www.chartjs.org/) para gráficos interactivos de alto rendimiento.
-   **Procesamiento**: [PapaParse](https://www.papaparse.com/) para el análisis eficiente de archivos de gran tamaño.
-   **Exportación**: [jsPDF](https://github.com/parallax/jsPDF) y [html2canvas](https://html2canvas.hertzen.com/) para la generación de reportes en PDF.

## 🛠️ Cómo utilizarlo

1.  **Clona o descarga** el repositorio.
2.  Abre `index.html` en tu navegador (no requiere servidor backend).
3.  **Arrastra y suelta** tu archivo CSV en la zona de carga.
4.  Haz clic en **"Iniciar Análisis Completo"** y navega por el panel lateral para explorar los resultados.
5.  **Exporta** tus hallazgos en formato PDF o Markdown para compartirlos.

## 🧩 Arquitectura

El proyecto está estructurado de forma modular para facilitar su mantenimiento:

-   `eda-engine.js`: El motor lógico que procesa las estadísticas y genera los hallazgos.
-   `charts.js`: Capa de abstracción para la creación de visualizaciones interactivas.
-   `app.js`: Controlador principal que maneja la interfaz de usuario y el flujo de los pasos.
-   `styles.css`: Sistema de diseño moderno basado en variables CSS para una personalización sencilla.

---

