/* ========================================
   App Controller - Main Application Logic
   ======================================== */

(function () {
    'use strict';

    const engine = new EDAEngine();
    const charts = new ChartManager();

    // DOM Elements
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const navLinks = document.querySelectorAll('.nav-link');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const dataPreview = document.getElementById('dataPreview');
    const previewTable = document.getElementById('previewTable');
    const startAnalysisBtn = document.getElementById('startAnalysis');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    const sectionTitle = document.getElementById('sectionTitle');
    const stepIndicator = document.getElementById('stepIndicator');
    const datasetInfo = document.getElementById('datasetInfo');

    const sectionNames = {
        upload: 'Cargar Datos',
        structure: 'Estructura y Dimensiones',
        types: 'Tipos de Variables',
        missing: 'Valores Nulos / Missing',
        descriptive: 'Estadísticas Descriptivas',
        distribution: 'Distribución de Variables',
        outliers: 'Valores Atípicos',
        bivariate: 'Relaciones entre Variables',
        correlation: 'Matriz de Correlaciones',
        visualizations: 'Visualizaciones Clave',
        duplicates: 'Detección de Duplicados',
        quality: 'Calidad y Consistencia',
        findings: 'Hallazgos Principales',
        nextsteps: 'Próximos Pasos'
    };

    const sectionOrder = Object.keys(sectionNames);
    let currentSection = 'upload';
    let analysisRun = false;

    /* ========================================
       Navigation
       ======================================== */
    function navigateTo(sectionId) {
        // En lugar de bloquear, permitimos navegar pero indicamos que no hay datos
        if (sectionId !== 'upload' && !analysisRun) {
            console.log('Navegación restringida: primero cargue datos.');
        }
        
        // Update sections
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(sectionId);
        if (target) target.classList.add('active');

        // Update nav
        navLinks.forEach(l => l.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
        if (activeLink) activeLink.classList.add('active');

        currentSection = sectionId;
        const idx = sectionOrder.indexOf(sectionId);
        sectionTitle.textContent = sectionNames[sectionId] || sectionId;
        stepIndicator.textContent = `Paso ${idx + 1} de ${sectionOrder.length}`;

        // Scroll to top
        document.getElementById('contentArea').scrollTo({ top: 0, behavior: 'smooth' });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            navigateTo(section);
        });
    });

    // Sidebar toggle (mobile)
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Close sidebar on section click (mobile)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 900 && !sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });

    /* ========================================
       File Upload
       ======================================== */
    browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    });

    const loadSampleBtn = document.getElementById('loadSampleBtn');

    loadSampleBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
            loadingOverlay.style.display = 'flex';
            loadingText.textContent = 'Cargando datos de ejemplo...';
            
            const response = await fetch('sample_data.csv');
            const blob = await response.blob();
            const file = new File([blob], 'sample_data_ejemplo.csv', { type: 'text/csv' });
            
            await handleFile(file);
            loadingOverlay.style.display = 'none';
        } catch (err) {
            loadingOverlay.style.display = 'none';
            alert('Error al cargar datos de ejemplo: ' + err.message);
        }
    });

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) handleFile(file);
    });

    async function handleFile(file) {
        // B-01: Validate file size and type
        const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
        if (file.size > MAX_FILE_SIZE) {
            alert(`El archivo excede el límite de ${MAX_FILE_SIZE / 1024 / 1024}MB. Considere usar un subconjunto de los datos.`);
            return;
        }
        const validExtensions = ['.csv', '.tsv', '.txt'];
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (!validExtensions.includes(ext)) {
            alert('Formato de archivo no soportado. Use CSV, TSV o TXT.');
            return;
        }

        dropZone.style.display = 'none';
        uploadProgress.style.display = 'block';

        let progress = 0;
        const progressInterval = setInterval(() => {
            progress = Math.min(progress + Math.random() * 15, 90);
            progressFill.style.width = progress + '%';
            progressText.textContent = `Leyendo ${file.name}...`;
        }, 200);

        try {
            const result = await engine.parseCSV(file);
            clearInterval(progressInterval);
            progressFill.style.width = '100%';
            progressText.textContent = `✓ ${result.rowCount.toLocaleString()} filas × ${result.colCount} columnas cargadas`;

            // Update dataset info
            document.getElementById('datasetName').textContent = file.name;
            document.getElementById('colCount').textContent = result.colCount;
            document.getElementById('rowCount').textContent = result.rowCount.toLocaleString();
            datasetInfo.style.display = 'flex';

            // Build preview table
            buildPreviewTable(result.headers, result.data);
            dataPreview.style.display = 'block';

        } catch (err) {
            clearInterval(progressInterval);
            progressFill.style.width = '0%';
            progressText.textContent = '✗ Error al leer el archivo: ' + err.message;
            console.error(err);
        }
    }

    function buildPreviewTable(headers, data) {
        const rows = data.slice(0, 20);
        let html = '<thead><tr><th>#</th>';
        headers.forEach(h => { html += `<th>${escapeHtml(h)}</th>`; });
        html += '</tr></thead><tbody>';
        rows.forEach((row, idx) => {
            html += `<tr><td>${idx + 1}</td>`;
            headers.forEach(h => {
                const val = row[h];
                const display = val === null || val === undefined || val === '' ? '<span style="color:var(--accent-red);opacity:0.7">null</span>' : escapeHtml(String(val));
                html += `<td>${display}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody>';
        previewTable.innerHTML = html;
    }

    /* ========================================
       Start Full Analysis
       ======================================== */
    startAnalysisBtn.addEventListener('click', runFullAnalysis);

    async function runFullAnalysis() {
        loadingOverlay.style.display = 'flex';
        analysisRun = true;

        // Enable all nav links
        navLinks.forEach(l => l.classList.remove('disabled'));
        exportPdfBtn.classList.remove('disabled');
        exportPdfBtn.disabled = false;
        exportMdBtn.classList.remove('disabled');
        exportMdBtn.disabled = false;

        const steps = [
            { name: 'Analizando estructura...', fn: renderStructure },
            { name: 'Clasificando variables...', fn: renderTypes },
            { name: 'Detectando valores nulos...', fn: renderMissing },
            { name: 'Calculando estadísticas...', fn: renderDescriptive },
            { name: 'Analizando distribuciones...', fn: renderDistribution },
            { name: 'Detectando outliers...', fn: renderOutliers },
            { name: 'Explorando relaciones...', fn: renderBivariate },
            { name: 'Calculando correlaciones...', fn: renderCorrelation },
            { name: 'Generando visualizaciones...', fn: renderVisualizations },
            { name: 'Detectando duplicados...', fn: renderDuplicates },
            { name: 'Evaluando calidad...', fn: renderQuality },
            { name: 'Documentando hallazgos...', fn: renderFindings },
            { name: 'Definiendo próximos pasos...', fn: renderNextSteps },
        ];

        for (let i = 0; i < steps.length; i++) {
            loadingText.textContent = steps[i].name;
            await delay(150);
            try {
                steps[i].fn();
            } catch (e) {
                console.error(`Error in step ${steps[i].name}:`, e);
                // B-05: Visual error feedback
                const sectionId = sectionOrder[i + 1];
                const section = document.getElementById(sectionId);
                if (section) {
                    const container = section.querySelector('[id$="Content"], [id$="Metrics"], .metrics-grid');
                    if (container) {
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'card';
                        errorDiv.style.borderColor = 'var(--accent-red)';
                        errorDiv.innerHTML = `
                            <div style="text-align:center;padding:20px">
                                <i class="fas fa-exclamation-circle" style="font-size:2rem;color:var(--accent-red);margin-bottom:8px"></i>
                                <h3>Error en el análisis</h3>
                                <p style="color:var(--text-secondary)">Esta sección encontró un error: ${escapeHtml(e.message)}</p>
                            </div>`;
                        container.appendChild(errorDiv);
                    }
                }
            }
            // Mark completed
            const link = navLinks[i + 1]; // +1 because index 0 is upload
            if (link) link.classList.add('completed');
        }

        loadingOverlay.style.display = 'none';
        navigateTo('structure');
    }

    /* ========================================
       Section Renderers
       ======================================== */

    // 1. Structure
    function renderStructure() {
        const s = engine.getStructure();
        const metricsContainer = document.getElementById('structureMetrics');
        metricsContainer.innerHTML = `
            ${metricCard('fas fa-rows', 'cyan', 'Filas', s.rows.toLocaleString(), 'Registros totales')}
            ${metricCard('fas fa-columns', 'purple', 'Columnas', s.columns, 'Variables totales')}
            ${metricCard('fas fa-hashtag', 'green', 'Numéricas', s.numericCols, `${((s.numericCols / s.columns) * 100).toFixed(0)}% del dataset`)}
            ${metricCard('fas fa-font', 'pink', 'Categóricas', s.categoricalCols, `${((s.categoricalCols / s.columns) * 100).toFixed(0)}% del dataset`)}
            ${metricCard('fas fa-th', 'orange', 'Celdas', s.totalCells.toLocaleString(), `${s.nullCells} nulas`)}
            ${metricCard('fas fa-percentage', 'cyan', 'Completitud', s.completeness + '%', 'Datos no nulos', 'success')}
        `;

        // Column details table
        const details = document.getElementById('structureDetails');
        let tableHtml = `
            <div class="card-header">
                <h3><i class="fas fa-list"></i> Detalle de Columnas</h3>
                <span class="badge">${s.columns} columnas</span>
            </div>
            <div class="table-wrapper">
                <table class="data-table">
                    <thead><tr>
                        <th>#</th><th>Columna</th><th>Tipo</th><th>No-Nulos</th><th>Únicos</th><th>% Únicos</th>
                    </tr></thead>
                    <tbody>
        `;
        s.columnList.forEach((col, idx) => {
            const pctUnique = ((col.unique / s.rows) * 100).toFixed(1);
            tableHtml += `<tr>
                <td>${idx + 1}</td>
                <td style="color:var(--accent-cyan);font-weight:600">${escapeHtml(col.name)}</td>
                <td><span class="badge ${col.type === 'numeric' ? 'badge-purple' : 'badge-green'}">${col.type}</span></td>
                <td>${col.nonNull.toLocaleString()} / ${s.rows.toLocaleString()}</td>
                <td>${col.unique.toLocaleString()}</td>
                <td>${pctUnique}%</td>
            </tr>`;
        });
        tableHtml += '</tbody></table></div>';
        details.innerHTML = tableHtml;
    }

    // 2. Variable Types
    function renderTypes() {
        const types = engine.getVariableTypes();
        const container = document.getElementById('typesContent');

        // Type summary chart
        const numCount = Object.values(types).filter(t => t.baseType === 'numeric').length;
        const catCount = Object.values(types).filter(t => t.baseType === 'categorical').length;

        let html = `
            <div class="card" style="grid-column: 1 / -1">
                <div class="card-header">
                    <h3><i class="fas fa-list-alt"></i> Detalle por Variable</h3>
                    <div style="display:flex; gap:10px">
                        <span class="badge badge-purple">${numCount} Numéricas</span>
                        <span class="badge badge-green">${catCount} Categóricas</span>
                    </div>
                </div>
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead><tr>
                            <th>Variable</th><th>Tipo Base</th><th>Tipo Detallado</th><th>Únicos</th><th>% Únicos</th><th>Muestra</th>
                        </tr></thead>
                        <tbody>
        `;
        Object.entries(types).forEach(([col, info]) => {
            const badgeClass = {
                'integer': 'badge-cyan', 'float': 'badge-purple', 'categorical': 'badge-green',
                'text': 'badge-orange', 'boolean': 'badge-pink', 'datetime': 'badge-red'
            }[info.detailedType] || 'badge-cyan';

            html += `<tr>
                <td style="font-weight:600;color:var(--text-primary)">${escapeHtml(col)}</td>
                <td><span class="badge ${info.baseType === 'numeric' ? 'badge-purple' : 'badge-green'}">${info.baseType}</span></td>
                <td><span class="badge ${badgeClass}">${info.detailedType}</span></td>
                <td>${info.uniqueValues.toLocaleString()}</td>
                <td>${info.uniqueRatio}%</td>
                <td style="color:var(--text-secondary);font-size:0.78rem">${info.sampleValues.map(v => escapeHtml(String(v))).join(', ')}</td>
            </tr>`;
        });
        html += '</tbody></table></div></div>';
        container.innerHTML = html;
    }

    // 3. Missing Values
    function renderMissing() {
        const m = engine.getMissingValues();
        const metricsContainer = document.getElementById('missingMetrics');
        const contentContainer = document.getElementById('missingContent');

        metricsContainer.innerHTML = `
            ${metricCard('fas fa-exclamation-circle', 'red', 'Total Faltantes', m.totalMissing.toLocaleString(), `de ${m.totalCells.toLocaleString()} celdas`, m.totalMissing > 0 ? 'warn' : 'success')}
            ${metricCard('fas fa-percentage', 'orange', '% Faltantes', m.overallPercentage + '%', 'Del total de datos', parseFloat(m.overallPercentage) > 5 ? 'warn' : 'success')}
            ${metricCard('fas fa-columns', 'purple', 'Columnas Afectadas', m.columnsWithMissing, `de ${engine.headers.length} columnas`)}
            ${metricCard('fas fa-check-circle', 'green', 'Filas Completas', m.completeRows.toLocaleString(), `de ${engine.data.length.toLocaleString()} filas`, 'success')}
        `;

        // Missing chart + bar breakdown
        let html = '';

        // Chart
        const hasMissing = Object.values(m.byColumn).some(v => v.count > 0);
        if (hasMissing) {
            html += `
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-chart-bar"></i> Valores Faltantes por Columna</h3>
                    </div>
                    <div class="chart-canvas-wrapper" style="min-height:${Math.max(200, m.columnsWithMissing * 30)}px">
                        <canvas id="missingChart"></canvas>
                    </div>
                </div>
            `;
        }

        // Detail bars
        html += '<div class="card"><div class="card-header"><h3><i class="fas fa-bars"></i> Detalle de Valores Faltantes</h3></div>';
        const sorted = Object.entries(m.byColumn).sort((a, b) => b[1].count - a[1].count);
        sorted.forEach(([col, info]) => {
            const pct = parseFloat(info.percentage);
            const color = pct > 30 ? 'var(--accent-red)' : pct > 10 ? 'var(--accent-orange)' : pct > 0 ? 'var(--accent-cyan)' : 'var(--accent-green)';
            html += `
                <div class="missing-bar-container">
                    <div class="missing-bar-label">
                        <span>${escapeHtml(col)}</span>
                        <span>${info.count.toLocaleString()} (${info.percentage}%)</span>
                    </div>
                    <div class="missing-bar">
                        <div class="missing-bar-fill" style="width:${Math.max(pct, pct > 0 ? 1 : 0)}%;background:${color}"></div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        contentContainer.innerHTML = html;

        if (hasMissing) {
            setTimeout(() => {
                charts.createMissingChart('missingChart', m, engine.headers);
            }, 50);
        }
    }

    // 4. Descriptive Statistics
    function renderDescriptive() {
        const stats = engine.getDescriptiveStats();
        const container = document.getElementById('descriptiveContent');
        let html = '';

        // Numeric stats table
        if (Object.keys(stats.numericStats).length > 0) {
            html += `
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-hashtag"></i> Variables Numéricas</h3>
                        <span class="badge badge-purple">${Object.keys(stats.numericStats).length} variables</span>
                    </div>
                    <div class="table-wrapper">
                        <table class="data-table">
                            <thead><tr>
                                <th>Variable</th><th>Count</th><th>Media</th><th>Std</th><th>Min</th><th>Q1</th><th>Mediana</th><th>Q3</th><th>Max</th><th>Skew</th><th>Kurt (exc.)</th><th>CV%</th>
                            </tr></thead>
                            <tbody>
            `;
            Object.entries(stats.numericStats).forEach(([col, s]) => {
                html += `<tr>
                    <td style="font-weight:600;color:var(--accent-cyan)">${escapeHtml(col)}</td>
                    <td>${s.count.toLocaleString()}</td>
                    <td>${EDAEngine.formatNumber(s.mean)}</td>
                    <td>${EDAEngine.formatNumber(s.std)}</td>
                    <td>${EDAEngine.formatNumber(s.min)}</td>
                    <td>${EDAEngine.formatNumber(s.q1)}</td>
                    <td>${EDAEngine.formatNumber(s.median)}</td>
                    <td>${EDAEngine.formatNumber(s.q3)}</td>
                    <td>${EDAEngine.formatNumber(s.max)}</td>
                    <td style="color:${Math.abs(s.skewness) > 1 ? 'var(--accent-orange)' : 'var(--text-secondary)'}">${s.skewness.toFixed(2)}</td>
                    <td>${s.kurtosis.toFixed(2)}</td>
                    <td>${s.cv.toFixed(1)}</td>
                </tr>`;
            });
            html += '</tbody></table></div></div>';
        }

        // Categorical stats
        if (Object.keys(stats.categoricalStats).length > 0) {
            html += `
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-font"></i> Variables Categóricas</h3>
                        <span class="badge badge-green">${Object.keys(stats.categoricalStats).length} variables</span>
                    </div>
                    <div class="table-wrapper">
                        <table class="data-table">
                            <thead><tr>
                                <th>Variable</th><th>Count</th><th>Únicos</th><th>Moda</th><th>Freq. Moda</th><th>Top 5 Valores</th>
                            </tr></thead>
                            <tbody>
            `;
            Object.entries(stats.categoricalStats).forEach(([col, s]) => {
                const top5 = s.topValues.slice(0, 5).map(v => `${escapeHtml(String(v.value))} (${v.percentage}%)`).join(', ');
                html += `<tr>
                    <td style="font-weight:600;color:var(--accent-green)">${escapeHtml(col)}</td>
                    <td>${s.count.toLocaleString()}</td>
                    <td>${s.unique}</td>
                    <td style="color:var(--accent-cyan)">${escapeHtml(String(s.mode))}</td>
                    <td>${s.modeFreq.toLocaleString()}</td>
                    <td style="color:var(--text-secondary);font-size:0.78rem;max-width:300px">${top5}</td>
                </tr>`;
            });
            html += '</tbody></table></div></div>';
        }

        container.innerHTML = html;
    }

    // 5. Distribution (Univariate)
    function renderDistribution() {
        const controlsContainer = document.getElementById('distControls');
        const chartsContainer = document.getElementById('distributionCharts');

        // Show first few columns by default
        const allCols = engine.headers;
        const defaultCols = allCols.slice(0, 6);

        controlsContainer.innerHTML = `
            <label><i class="fas fa-filter"></i> Seleccionar Variable:</label>
            <select id="distColumnSelect" style="min-width:200px">
                <option value="" disabled selected>Elegir...</option>
                ${allCols.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
            <div style="flex-grow:1"></div>
            <button class="btn-secondary" id="distShowAll"><i class="fas fa-th"></i> Ver Todas</button>
            <button class="btn-secondary active" id="distShowDefault"><i class="fas fa-eye"></i> Primeras 6</button>
        `;

        function renderDistCharts(columns) {
            // O-02: Only destroy distribution charts, not all charts
            Object.keys(charts.charts)
                .filter(id => id.startsWith('distChart_'))
                .forEach(id => charts.destroy(id));
            chartsContainer.innerHTML = '';

            columns.forEach((col, idx) => {
                const dist = engine.getDistribution(col);
                if (!dist) return;

                const canvasId = `distChart_${idx}`;
                const div = document.createElement('div');
                div.className = 'chart-container fade-in stagger-' + Math.min(idx + 1, 6);
                div.innerHTML = `
                    <div class="chart-title"><i class="fas fa-${dist.type === 'numeric' ? 'chart-area' : 'chart-bar'}"></i> ${escapeHtml(col)}</div>
                    <div class="chart-canvas-wrapper"><canvas id="${canvasId}"></canvas></div>
                `;
                chartsContainer.appendChild(div);

                if (dist.type === 'numeric') {
                    charts.createHistogram(canvasId, dist);
                } else {
                    charts.createBarChart(canvasId, dist, null, dist.categories.length > 5);
                }
            });
        }

        renderDistCharts(defaultCols);

        // Event Listeners
        document.getElementById('distColumnSelect').addEventListener('change', (e) => {
            const val = e.target.value;
            if (val) {
                renderDistCharts([val]);
                // Deactivate general buttons
                document.getElementById('distShowAll').classList.remove('active');
                document.getElementById('distShowDefault').classList.remove('active');
            }
        });

        document.getElementById('distShowAll').addEventListener('click', () => {
            renderDistCharts(allCols);
            document.getElementById('distShowAll').classList.add('active');
            document.getElementById('distShowDefault').classList.remove('active');
            document.getElementById('distColumnSelect').value = "";
        });

        document.getElementById('distShowDefault').addEventListener('click', () => {
            renderDistCharts(defaultCols);
            document.getElementById('distShowDefault').classList.add('active');
            document.getElementById('distShowAll').classList.remove('active');
            document.getElementById('distColumnSelect').value = "";
        });
    }

    // 6. Outliers
    function renderOutliers() {
        const o = engine.getOutliers();
        const metricsContainer = document.getElementById('outlierMetrics');
        const contentContainer = document.getElementById('outlierContent');

        metricsContainer.innerHTML = `
            ${metricCard('fas fa-dot-circle', 'red', 'Total Outliers', o.totalOutliers.toLocaleString(), 'Valores atípicos detectados', o.totalOutliers > 0 ? 'warn' : 'success')}
            ${metricCard('fas fa-columns', 'orange', 'Columnas Afectadas', o.columnsWithOutliers, `de ${engine.numericColumns.length} numéricas`)}
        `;

        let html = '<div class="card"><div class="card-header"><h3><i class="fas fa-dot-circle"></i> Outliers por Variable (Método IQR)</h3></div>';

        const sorted = Object.entries(o.byColumn)
            .sort((a, b) => b[1].count - a[1].count);

        sorted.forEach(([col, info]) => {
            const pct = info.count / engine.data.length * 100;
            html += `
                <div class="outlier-row">
                    <span class="col-name">${escapeHtml(col)}</span>
                    <div class="outlier-bar-bg">
                        <div class="outlier-bar-fill" style="width:${Math.max(pct, info.count > 0 ? 1 : 0)}%"></div>
                    </div>
                    <span class="outlier-count">${info.count} (${info.percentage}%)</span>
                </div>
            `;
        });

        html += '</div>';

        // Table with bounds
        if (Object.keys(o.byColumn).length > 0) {
            html += `
                <div class="card" style="margin-top:20px">
                    <div class="card-header">
                        <h3><i class="fas fa-sliders-h"></i> Límites IQR</h3>
                    </div>
                    <div class="table-wrapper">
                        <table class="data-table">
                            <thead><tr>
                                <th>Variable</th><th>Q1</th><th>Q3</th><th>IQR</th><th>Límite Inferior</th><th>Límite Superior</th><th>Min</th><th>Max</th><th>Outliers</th>
                            </tr></thead>
                            <tbody>
            `;
            sorted.forEach(([col, info]) => {
                html += `<tr>
                    <td style="font-weight:600;color:var(--accent-cyan)">${escapeHtml(col)}</td>
                    <td>${EDAEngine.formatNumber(info.q1)}</td>
                    <td>${EDAEngine.formatNumber(info.q3)}</td>
                    <td>${EDAEngine.formatNumber(info.iqr)}</td>
                    <td>${EDAEngine.formatNumber(info.lowerBound)}</td>
                    <td>${EDAEngine.formatNumber(info.upperBound)}</td>
                    <td>${EDAEngine.formatNumber(info.min)}</td>
                    <td>${EDAEngine.formatNumber(info.max)}</td>
                    <td style="color:${info.count > 0 ? 'var(--accent-orange)' : 'var(--accent-green)'};font-weight:600">${info.count}</td>
                </tr>`;
            });
            html += '</tbody></table></div></div>';
        }

        contentContainer.innerHTML = html;
    }

    // 7. Bivariate Analysis
    function renderBivariate() {
        const controlsContainer = document.getElementById('bivariateControls');
        const chartsContainer = document.getElementById('bivariateCharts');

        if (engine.numericColumns.length < 2) {
            chartsContainer.innerHTML = '<div class="card"><p>Se necesitan al menos 2 variables numéricas para el análisis bivariado.</p></div>';
            return;
        }

        const numCols = engine.numericColumns.slice(0, 10);

        controlsContainer.innerHTML = `
            <label><i class="fas fa-arrow-right"></i> Eje X:</label>
            <select id="bivarX">
                ${numCols.map((c, i) => `<option value="${c}" ${i === 0 ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
            <label><i class="fas fa-arrow-up"></i> Eje Y:</label>
            <select id="bivarY">
                ${numCols.map((c, i) => `<option value="${c}" ${i === 1 ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
            <button class="btn-secondary" id="bivarPlot"><i class="fas fa-chart-scatter"></i> Graficar</button>
            <button class="btn-secondary" id="bivarAll"><i class="fas fa-th"></i> Todos los Pares</button>
        `;

        function plotSingle() {
            const colX = document.getElementById('bivarX').value;
            const colY = document.getElementById('bivarY').value;
            chartsContainer.innerHTML = '';

            const bData = engine.getBivariateData(colX, colY);
            const div = document.createElement('div');
            div.className = 'chart-container';
            div.style.gridColumn = '1 / -1';
            div.innerHTML = `<div class="chart-canvas-wrapper" style="min-height:400px"><canvas id="scatterMain"></canvas></div>`;
            chartsContainer.appendChild(div);
            charts.createScatter('scatterMain', bData, colX, colY);
        }

        function plotAll() {
            chartsContainer.innerHTML = '';
            const pairs = [];
            for (let i = 0; i < Math.min(numCols.length, 5); i++) {
                for (let j = i + 1; j < Math.min(numCols.length, 5); j++) {
                    pairs.push([numCols[i], numCols[j]]);
                }
            }

            pairs.forEach(([colX, colY], idx) => {
                const bData = engine.getBivariateData(colX, colY);
                const canvasId = `scatter_${idx}`;
                const div = document.createElement('div');
                div.className = 'chart-container fade-in';
                div.innerHTML = `<div class="chart-canvas-wrapper"><canvas id="${canvasId}"></canvas></div>`;
                chartsContainer.appendChild(div);
                charts.createScatter(canvasId, bData, colX, colY);
            });
        }

        document.getElementById('bivarPlot').addEventListener('click', plotSingle);
        document.getElementById('bivarAll').addEventListener('click', plotAll);

        // Default: plot first pair
        plotSingle();
    }

    // 8. Correlation Matrix
    function renderCorrelation() {
        const corr = engine.getCorrelationMatrix();
        const container = document.getElementById('correlationContent');

        if (corr.columns.length < 2) {
            container.innerHTML = '<div class="card"><p>Se necesitan al menos 2 variables numéricas para calcular correlaciones.</p></div>';
            return;
        }

        let html = `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-border-all"></i> Heatmap de Correlación</h3>
                    <span class="badge">${corr.columns.length} variables</span>
                </div>
                <div class="correlation-matrix-wrapper">
                    <canvas id="corrHeatmap"></canvas>
                </div>
            </div>
        `;

        // Strong correlations table
        if (corr.strongCorrelations.length > 0) {
            html += `
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-link"></i> Correlaciones Significativas (|r| > 0.5)</h3>
                        <span class="badge badge-purple">${corr.strongCorrelations.length} pares</span>
                    </div>
                    <div class="table-wrapper">
                        <table class="data-table">
                            <thead><tr>
                                <th>Variable 1</th><th>Variable 2</th><th>Correlación</th><th>Fuerza</th><th>Dirección</th>
                            </tr></thead>
                            <tbody>
            `;
            corr.strongCorrelations.forEach(c => {
                const color = c.correlation > 0 ? 'var(--accent-cyan)' : 'var(--accent-red)';
                html += `<tr>
                    <td style="font-weight:600">${escapeHtml(c.col1)}</td>
                    <td style="font-weight:600">${escapeHtml(c.col2)}</td>
                    <td style="color:${color};font-weight:700;font-family:var(--font-mono)">${c.correlation}</td>
                    <td><span class="badge ${Math.abs(c.correlation) > 0.8 ? 'badge-red' : 'badge-orange'}">${c.strength}</span></td>
                    <td><span class="badge ${c.correlation > 0 ? 'badge-cyan' : 'badge-red'}">${c.direction}</span></td>
                </tr>`;
            });
            html += '</tbody></table></div></div>';
        }

        container.innerHTML = html;
        setTimeout(() => {
            charts.createCorrelationHeatmap('corrHeatmap', corr);
        }, 50);
    }

    // 9. Key Visualizations
    function renderVisualizations() {
        const container = document.getElementById('keyVisualizations');
        container.innerHTML = '';

        const stats = engine.getDescriptiveStats();

        // 1. Box plot summary for numeric variables
        if (engine.numericColumns.length > 0) {
            const boxCols = engine.numericColumns.slice(0, 8);
            const div = document.createElement('div');
            div.className = 'chart-container';
            div.style.gridColumn = '1 / -1';
            div.innerHTML = `<div class="chart-canvas-wrapper" style="min-height:350px"><canvas id="boxPlotChart"></canvas></div>`;
            container.appendChild(div);
            charts.createBoxPlotSimulated('boxPlotChart', stats.numericStats, boxCols);
        }

        // 2. Top categorical distributions
        const catCols = engine.categoricalColumns.slice(0, 4);
        catCols.forEach((col, idx) => {
            const dist = engine.getDistribution(col);
            if (!dist) return;
            const canvasId = `keyVis_cat_${idx}`;
            const div = document.createElement('div');
            div.className = 'chart-container fade-in';
            div.innerHTML = `
                <div class="chart-title"><i class="fas fa-chart-pie"></i> ${escapeHtml(col)}</div>
                <div class="chart-canvas-wrapper"><canvas id="${canvasId}"></canvas></div>
            `;
            container.appendChild(div);

            if (dist.categories.length <= 8) {
                charts.createDoughnut(canvasId,
                    dist.categories.map(c => c.value),
                    dist.categories.map(c => c.count),
                    null
                );
            } else {
                charts.createBarChart(canvasId, dist, null, true);
            }
        });

        // 3. Numeric distribution doughnut (types breakdown)
        if (engine.numericColumns.length > 0 && engine.categoricalColumns.length > 0) {
            const div = document.createElement('div');
            div.className = 'chart-container fade-in';
            div.innerHTML = `
                <div class="chart-title"><i class="fas fa-database"></i> Composición del Dataset</div>
                <div class="chart-canvas-wrapper"><canvas id="keyVis_composition"></canvas></div>
            `;
            container.appendChild(div);
            charts.createDoughnut('keyVis_composition',
                ['Numéricas', 'Categóricas'],
                [engine.numericColumns.length, engine.categoricalColumns.length],
                null
            );
        }
    }

    // 10. Duplicates
    function renderDuplicates() {
        const d = engine.getDuplicates();
        const metricsContainer = document.getElementById('duplicateMetrics');
        const contentContainer = document.getElementById('duplicateContent');

        metricsContainer.innerHTML = `
            ${metricCard('fas fa-clone', d.exactDuplicates > 0 ? 'red' : 'green', 'Duplicados Exactos', d.exactDuplicates.toLocaleString(), `${d.duplicatePercentage}% del dataset`, d.exactDuplicates > 0 ? 'warn' : 'success')}
            ${metricCard('fas fa-fingerprint', 'cyan', 'Filas Únicas', d.uniqueRows.toLocaleString(), `de ${engine.data.length.toLocaleString()} totales`, 'success')}
        `;

        let html = '';
        if (d.exactDuplicates > 0) {
            html += `
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-search"></i> Muestra de Filas Duplicadas</h3>
                        <span class="badge badge-orange">${d.exactDuplicates} encontrados</span>
                    </div>
                    <div class="table-wrapper">
                        <table class="data-table">
                            <thead><tr><th>Índice</th>${engine.headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
                            <tbody>
            `;
            d.sampleDuplicateIndices.forEach(idx => {
                const row = engine.data[idx];
                html += `<tr><td style="color:var(--accent-orange);font-weight:600">${idx + 1}</td>`;
                engine.headers.forEach(h => {
                    html += `<td>${escapeHtml(String(row[h] ?? 'null'))}</td>`;
                });
                html += '</tr>';
            });
            html += '</tbody></table></div></div>';
        } else {
            html += `
                <div class="card" style="text-align:center;padding:40px">
                    <i class="fas fa-check-circle" style="font-size:3rem;color:var(--accent-green);margin-bottom:16px"></i>
                    <h3 style="margin-bottom:8px">¡Sin Duplicados!</h3>
                    <p style="color:var(--text-secondary)">No se detectaron filas duplicadas en el dataset.</p>
                </div>
            `;
        }

        contentContainer.innerHTML = html;
    }

    // 11. Quality Assessment
    function renderQuality() {
        const q = engine.getQualityAssessment();
        const container = document.getElementById('qualityContent');

        const scoreColor = q.score >= 80 ? '#10b981' : q.score >= 60 ? '#f59e0b' : '#ef4444';
        const circumference = 2 * Math.PI * 75;
        const offset = circumference - (q.score / 100) * circumference;

        let html = `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-shield-alt"></i> Índice de Calidad del Dataset</h3>
                </div>
                <div class="quality-score-ring">
                    <div class="score-circle">
                        <svg viewBox="0 0 180 180" width="180" height="180">
                            <circle class="bg-ring" cx="90" cy="90" r="75"/>
                            <circle class="fg-ring" cx="90" cy="90" r="75"
                                stroke="${scoreColor}"
                                stroke-dasharray="${circumference}"
                                stroke-dashoffset="${offset}"/>
                        </svg>
                        <div class="score-text">
                            <span class="value" style="color:${scoreColor}">${q.score}</span>
                            <span class="label">Calidad</span>
                        </div>
                    </div>
                    <div class="quality-checks">
        `;

        q.checks.forEach(check => {
            const icon = check.status === 'pass' ? 'fas fa-check' : check.status === 'warn' ? 'fas fa-exclamation' : 'fas fa-times';
            html += `
                <div class="quality-check">
                    <div class="check-status ${check.status}"><i class="${icon}"></i></div>
                    <span class="check-label">${check.name}</span>
                    <span class="check-value">${check.value}</span>
                </div>
            `;
        });

        html += `
                    </div>
                </div>
            </div>
        `;

        // Recommendations based on quality
        html += `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-clipboard-check"></i> Detalle de Verificaciones</h3>
                </div>
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead><tr><th>Verificación</th><th>Estado</th><th>Resultado</th><th>Detalle</th></tr></thead>
                        <tbody>
        `;
        q.checks.forEach(check => {
            const statusBadge = check.status === 'pass' ? 'badge-green' : check.status === 'warn' ? 'badge-orange' : 'badge-red';
            const statusLabel = check.status === 'pass' ? 'OK' : check.status === 'warn' ? 'Advertencia' : 'Fallo';
            html += `<tr>
                <td style="font-weight:600">${check.name}</td>
                <td><span class="badge ${statusBadge}">${statusLabel}</span></td>
                <td style="font-family:var(--font-mono)">${check.value}</td>
                <td style="color:var(--text-secondary)">${check.detail}</td>
            </tr>`;
        });
        html += '</tbody></table></div></div>';

        container.innerHTML = html;
    }

    // 12. Findings
    function renderFindings() {
        const findings = engine.getFindings();
        const container = document.getElementById('findingsContent');

        let html = '';
        findings.forEach(f => {
            html += `
                <div class="finding-card fade-in">
                    <div class="finding-icon ${f.iconClass}">
                        <i class="${f.icon}"></i>
                    </div>
                    <div class="finding-body">
                        <h4>${f.title}</h4>
                        <p>${f.description}</p>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // 13. Next Steps
    function renderNextSteps() {
        const steps = engine.getNextSteps();
        const container = document.getElementById('nextstepsContent');

        let html = '';
        steps.forEach(s => {
            html += `
                <div class="step-card fade-in">
                    <div class="step-number">${s.num}</div>
                    <h4>${s.title}</h4>
                    <p>${s.description}</p>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    /* ========================================
       Export Report
       ======================================== */
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const exportMdBtn = document.getElementById('exportMdBtn');

    exportPdfBtn.addEventListener('click', exportPDF);
    exportMdBtn.addEventListener('click', exportMarkdown);

    /**
     * PDF Export — Generates a professional multi-page PDF
     * capturing all rendered sections with their charts and tables.
     */
    async function exportPDF() {
        if (!analysisRun) return;

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();   // 210
        const pageH = pdf.internal.pageSize.getHeight();  // 297
        const margin = 14;
        const contentW = pageW - margin * 2;

        // --- Progress Overlay ---
        const overlay = document.createElement('div');
        overlay.className = 'pdf-overlay';
        overlay.innerHTML = `
            <div class="pdf-progress">
                <div class="pdf-progress-icon"><i class="fas fa-file-pdf"></i></div>
                <h3>Generando Reporte PDF</h3>
                <p class="pdf-progress-status" id="pdfStatus">Preparando documento...</p>
                <div class="pdf-progress-bar"><div class="pdf-progress-fill" id="pdfProgressFill"></div></div>
                <p class="pdf-progress-step" id="pdfStep">Paso 0 / 14</p>
            </div>
        `;
        document.body.appendChild(overlay);
        const pdfStatus = document.getElementById('pdfStatus');
        const pdfProgressFill = document.getElementById('pdfProgressFill');
        const pdfStep = document.getElementById('pdfStep');

        function updateProgress(step, total, text) {
            const pct = Math.round((step / total) * 100);
            pdfStatus.textContent = text;
            pdfProgressFill.style.width = pct + '%';
            pdfStep.textContent = `Paso ${step} / ${total}`;
        }

        try {
            const totalSteps = 15;

            // ============================================
            // COVER PAGE
            // ============================================
            updateProgress(1, totalSteps, 'Creando portada...');
            await delay(80);

            // Dark background
            pdf.setFillColor(10, 14, 26);
            pdf.rect(0, 0, pageW, pageH, 'F');

            // Top decorative gradient bar
            const gradientSteps = 80;
            for (let i = 0; i < gradientSteps; i++) {
                const ratio = i / gradientSteps;
                const r = Math.round(0 + ratio * 124);
                const g = Math.round(212 - ratio * 154);
                const b = Math.round(255 - ratio * 18);
                pdf.setFillColor(r, g, b);
                pdf.rect(0, i * (6 / gradientSteps), pageW, 6 / gradientSteps + 0.1, 'F');
            }

            // Logo text
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(42);
            pdf.setTextColor(232, 236, 244);
            pdf.text('EDA', pageW / 2 - 25, 65);
            pdf.setTextColor(0, 212, 255);
            pdf.text('Pro', pageW / 2 + 17, 65);

            // Subtitle
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(14);
            pdf.setTextColor(136, 146, 168);
            pdf.text('Reporte de Análisis Exploratorio de Datos', pageW / 2, 80, { align: 'center' });

            // Divider line
            pdf.setDrawColor(0, 212, 255);
            pdf.setLineWidth(0.5);
            pdf.line(pageW / 2 - 30, 90, pageW / 2 + 30, 90);

            // Dataset info box
            const structure = engine.getStructure();
            const quality = engine.getQualityAssessment();
            const boxY = 105;

            pdf.setFillColor(15, 20, 40);
            pdf.roundedRect(margin + 10, boxY, contentW - 20, 65, 4, 4, 'F');
            pdf.setDrawColor(255, 255, 255, 15);
            pdf.roundedRect(margin + 10, boxY, contentW - 20, 65, 4, 4, 'S');

            pdf.setFontSize(11);
            pdf.setTextColor(0, 212, 255);
            pdf.text('DATASET', margin + 20, boxY + 14);
            pdf.setTextColor(232, 236, 244);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(16);
            pdf.text(engine.fileName, margin + 20, boxY + 26);

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            pdf.setTextColor(136, 146, 168);

            const infoLines = [
                `Filas: ${structure.rows.toLocaleString()}  •  Columnas: ${structure.columns}`,
                `Numéricas: ${structure.numericCols}  •  Categóricas: ${structure.categoricalCols}`,
                `Completitud: ${structure.completeness}%  •  Calidad: ${quality.score}/100`
            ];
            infoLines.forEach((line, i) => {
                pdf.text(line, margin + 20, boxY + 38 + i * 8);
            });

            // Date and footer
            pdf.setFontSize(10);
            pdf.setTextColor(82, 92, 114);
            const now = new Date();
            const dateStr = now.toLocaleDateString('es-ES', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
            const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            pdf.text(`Generado el ${dateStr} a las ${timeStr}`, pageW / 2, 250, { align: 'center' });
            pdf.text('Generado con EDA Pro — Sistema de Análisis Exploratorio', pageW / 2, 258, { align: 'center' });

            // ============================================
            // CAPTURE EACH SECTION
            // ============================================
            const sectionsToCapture = [
                { id: 'structure',      name: 'Estructura y Dimensiones' },
                { id: 'types',          name: 'Tipos de Variables' },
                { id: 'missing',        name: 'Valores Nulos' },
                { id: 'descriptive',    name: 'Estadísticas Descriptivas' },
                { id: 'distribution',   name: 'Distribución de Variables' },
                { id: 'outliers',       name: 'Valores Atípicos' },
                { id: 'bivariate',      name: 'Relaciones entre Variables' },
                { id: 'correlation',    name: 'Matriz de Correlaciones' },
                { id: 'visualizations', name: 'Visualizaciones Clave' },
                { id: 'duplicates',     name: 'Detección de Duplicados' },
                { id: 'quality',        name: 'Calidad y Consistencia' },
                { id: 'findings',       name: 'Hallazgos Principales' },
                { id: 'nextsteps',      name: 'Próximos Pasos' },
            ];

            let pageNum = 1; // Cover is page 1

            for (let i = 0; i < sectionsToCapture.length; i++) {
                const sec = sectionsToCapture[i];
                updateProgress(i + 2, totalSteps, `Capturando: ${sec.name}...`);
                await delay(50);

                const sectionEl = document.getElementById(sec.id);
                if (!sectionEl) continue;

                // Temporarily show the section for capturing
                const wasActive = sectionEl.classList.contains('active');
                sectionEl.style.display = 'block';
                sectionEl.style.position = 'absolute';
                sectionEl.style.left = '-9999px';
                sectionEl.style.width = '1000px';
                sectionEl.style.opacity = '1';
                sectionEl.style.animation = 'none';

                // Wait for layout to settle
                await delay(100);

                try {
                    const canvas = await html2canvas(sectionEl, {
                        backgroundColor: '#0a0e1a',
                        scale: 1.8,
                        useCORS: true,
                        logging: false,
                        allowTaint: true,
                        windowWidth: 1000,
                        onclone: (doc) => {
                            // Ensure cloned section is visible
                            const cloned = doc.getElementById(sec.id);
                            if (cloned) {
                                cloned.style.display = 'block';
                                cloned.style.position = 'static';
                                cloned.style.left = 'auto';
                                cloned.style.opacity = '1';
                                cloned.style.animation = 'none';
                            }
                        }
                    });

                    const imgData = canvas.toDataURL('image/jpeg', 0.92);
                    const imgW = contentW;
                    const imgH = (canvas.height / canvas.width) * imgW;

                    // Split across pages if too tall
                    const maxContentH = pageH - margin * 2 - 18; // account for header + footer
                    let remainingH = imgH;
                    let srcY = 0;

                    while (remainingH > 0) {
                        pdf.addPage();
                        pageNum++;

                        // Page dark background
                        pdf.setFillColor(10, 14, 26);
                        pdf.rect(0, 0, pageW, pageH, 'F');

                        // Section header bar (on first slice only)
                        if (srcY === 0) {
                            const barSteps = 40;
                            for (let b = 0; b < barSteps; b++) {
                                const r2 = b / barSteps;
                                const r = Math.round(0 + r2 * 124);
                                const g = Math.round(212 - r2 * 154);
                                const bb = Math.round(255 - r2 * 18);
                                pdf.setFillColor(r, g, bb);
                                pdf.rect(0, b * (3 / barSteps), pageW, 3 / barSteps + 0.1, 'F');
                            }

                            pdf.setFont('helvetica', 'bold');
                            pdf.setFontSize(13);
                            pdf.setTextColor(0, 212, 255);
                            pdf.text(`${i + 1}.`, margin, 14);
                            pdf.setTextColor(232, 236, 244);
                            pdf.text(sec.name, margin + 9, 14);
                        }

                        const startY = srcY === 0 ? 20 : margin;
                        const sliceH = Math.min(remainingH, maxContentH - (srcY === 0 ? 6 : 0));
                        const srcSliceH = (sliceH / imgH) * canvas.height;

                        // Create a cropped canvas for this page slice
                        const sliceCanvas = document.createElement('canvas');
                        sliceCanvas.width = canvas.width;
                        sliceCanvas.height = srcSliceH;
                        const sliceCtx = sliceCanvas.getContext('2d');
                        sliceCtx.drawImage(canvas, 0, srcY, canvas.width, srcSliceH, 0, 0, canvas.width, srcSliceH);

                        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92);
                        pdf.addImage(sliceData, 'JPEG', margin, startY, imgW, sliceH);

                        // Footer
                        pdf.setFontSize(7);
                        pdf.setTextColor(82, 92, 114);
                        pdf.text(`EDA Pro  •  ${engine.fileName}`, margin, pageH - 6);
                        pdf.text(`Página ${pageNum}`, pageW - margin, pageH - 6, { align: 'right' });

                        srcY += srcSliceH;
                        remainingH -= sliceH;
                    }
                } catch (captureErr) {
                    console.warn(`Error capturing section "${sec.id}":`, captureErr);
                    // Add an error page for this section
                    pdf.addPage();
                    pageNum++;
                    pdf.setFillColor(10, 14, 26);
                    pdf.rect(0, 0, pageW, pageH, 'F');
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(13);
                    pdf.setTextColor(232, 236, 244);
                    pdf.text(`${i + 1}. ${sec.name}`, margin, 20);
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(10);
                    pdf.setTextColor(136, 146, 168);
                    pdf.text('No se pudo capturar esta sección.', margin, 32);
                }

                // Restore original state
                sectionEl.style.display = '';
                sectionEl.style.position = '';
                sectionEl.style.left = '';
                sectionEl.style.width = '';
                sectionEl.style.opacity = '';
                sectionEl.style.animation = '';
                if (!wasActive) {
                    sectionEl.classList.remove('active');
                }
            }

            // ============================================
            // SAVE
            // ============================================
            updateProgress(totalSteps, totalSteps, '¡Descargando PDF!');
            await delay(300);

            const safeFileName = engine.fileName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_\-]/g, '_');
            pdf.save(`reporte_eda_${safeFileName}.pdf`);

        } catch (err) {
            console.error('Error generating PDF:', err);
            alert('Error al generar el PDF: ' + err.message);
        } finally {
            overlay.remove();
        }
    }

    /**
     * Markdown Export — Text-based report (original functionality)
     */
    function exportMarkdown() {
        if (!analysisRun) return;

        const structure = engine.getStructure();
        const types = engine.getVariableTypes();
        const missing = engine.getMissingValues();
        const stats = engine.getDescriptiveStats();
        const outliers = engine.getOutliers();
        const corr = engine.getCorrelationMatrix();
        const dups = engine.getDuplicates();
        const quality = engine.getQualityAssessment();
        const findings = engine.getFindings();
        const nextSteps = engine.getNextSteps();

        let report = `# Reporte EDA - ${engine.fileName}\n`;
        report += `Fecha: ${new Date().toLocaleDateString('es-ES')}\n\n`;
        report += `## 1. Estructura\n- Filas: ${structure.rows}\n- Columnas: ${structure.columns}\n- Numéricas: ${structure.numericCols}\n- Categóricas: ${structure.categoricalCols}\n- Completitud: ${structure.completeness}%\n\n`;
        report += `## 2. Tipos de Variables\n`;
        Object.entries(types).forEach(([col, t]) => {
            report += `- ${col}: ${t.detailedType} (${t.uniqueValues} únicos)\n`;
        });
        report += `\n## 3. Valores Faltantes\n- Total: ${missing.totalMissing} (${missing.overallPercentage}%)\n- Columnas afectadas: ${missing.columnsWithMissing}\n- Filas completas: ${missing.completeRows}\n\n`;
        report += `## 4. Estadísticas Descriptivas\n`;
        Object.entries(stats.numericStats).forEach(([col, s]) => {
            report += `### ${col}\n  Media: ${s.mean.toFixed(2)}, Std: ${s.std.toFixed(2)}, Min: ${s.min}, Max: ${s.max}, Skew: ${s.skewness.toFixed(2)}\n`;
        });
        report += `\n## 5. Outliers\n- Total: ${outliers.totalOutliers}\n- Columnas afectadas: ${outliers.columnsWithOutliers}\n\n`;
        report += `## 6. Correlaciones Significativas\n`;
        corr.strongCorrelations.forEach(c => {
            report += `- ${c.col1} ↔ ${c.col2}: ${c.correlation} (${c.strength} ${c.direction})\n`;
        });
        report += `\n## 7. Duplicados\n- Exactos: ${dups.exactDuplicates} (${dups.duplicatePercentage}%)\n\n`;
        report += `## 8. Calidad del Dataset\n- Score: ${quality.score}/100\n`;
        quality.checks.forEach(c => {
            report += `- ${c.name}: ${c.status.toUpperCase()} - ${c.value}\n`;
        });
        report += `\n## 9. Hallazgos Principales\n`;
        findings.forEach(f => {
            report += `### ${f.title}\n${f.description}\n\n`;
        });
        report += `## 10. Próximos Pasos\n`;
        nextSteps.forEach(s => {
            report += `${s.num}. **${s.title}**: ${s.description}\n\n`;
        });

        // Download
        const blob = new Blob([report], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_eda_${engine.fileName.replace(/\.[^.]+$/, '')}.md`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /* ========================================
       Utility Functions
       ======================================== */
    function metricCard(icon, iconClass, label, value, detail, type = '') {
        return `
            <div class="metric-card ${type} fade-in">
                <div class="metric-icon ${iconClass}"><i class="${icon}"></i></div>
                <span class="metric-label">${label}</span>
                <span class="metric-value">${value}</span>
                <span class="metric-detail">${detail}</span>
            </div>
        `;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
})();
