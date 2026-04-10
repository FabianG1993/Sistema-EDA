/* ========================================
   Charts Module - Chart.js Visualizations
   ======================================== */

class ChartManager {
    constructor() {
        this.charts = {};
        this.colorPalette = [
            'rgba(0, 212, 255, 0.8)',    // cyan
            'rgba(124, 58, 237, 0.8)',   // purple
            'rgba(236, 72, 153, 0.8)',   // pink
            'rgba(16, 185, 129, 0.8)',   // green
            'rgba(245, 158, 11, 0.8)',   // orange
            'rgba(239, 68, 68, 0.8)',    // red
            'rgba(99, 102, 241, 0.8)',   // indigo
            'rgba(20, 184, 166, 0.8)',   // teal
            'rgba(168, 85, 247, 0.8)',   // violet
            'rgba(251, 146, 60, 0.8)',   // amber
        ];
        this.bgPalette = this.colorPalette.map(c => c.replace('0.8', '0.15'));

        // Global Chart.js defaults
        Chart.defaults.color = '#8892a8';
        Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.font.size = 12;
        Chart.defaults.plugins.legend.labels.usePointStyle = true;
        Chart.defaults.plugins.legend.labels.pointStyleWidth = 10;
        Chart.defaults.plugins.legend.labels.padding = 16;
        Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(10, 14, 30, 0.95)';
        Chart.defaults.plugins.tooltip.borderColor = 'rgba(0, 212, 255, 0.2)';
        Chart.defaults.plugins.tooltip.borderWidth = 1;
        Chart.defaults.plugins.tooltip.cornerRadius = 8;
        Chart.defaults.plugins.tooltip.padding = 12;
        Chart.defaults.plugins.tooltip.titleFont = { weight: '600', size: 13 };
        Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
    }

    /**
     * Destroy a chart by id
     */
    destroy(id) {
        if (this.charts[id]) {
            this.charts[id].destroy();
            delete this.charts[id];
        }
    }

    /**
     * Destroy all charts
     */
    destroyAll() {
        Object.keys(this.charts).forEach(id => this.destroy(id));
    }

    /**
     * Create histogram for numeric distribution
     */
    createHistogram(canvasId, data, title) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.bins.map(b => b.label),
                datasets: [{
                    label: 'Frecuencia',
                    data: data.bins.map(b => b.count),
                    backgroundColor: 'rgba(0, 212, 255, 0.3)',
                    borderColor: 'rgba(0, 212, 255, 0.8)',
                    borderWidth: 1,
                    borderRadius: 4,
                    barPercentage: 1,
                    categoryPercentage: 0.95
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: !!title,
                        text: title,
                        font: { size: 14, weight: '600' },
                        color: '#e8ecf4',
                        padding: { bottom: 16 }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            maxRotation: 45,
                            font: { size: 10 },
                            maxTicksLimit: 12
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: { font: { size: 11 } }
                    }
                }
            }
        });
    }

    /**
     * Create bar chart for categorical distribution
     */
    createBarChart(canvasId, data, title, horizontal = true) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const labels = data.categories.map(c => c.value);
        const values = data.categories.map(c => c.count);
        const colors = values.map((_, i) => this.colorPalette[i % this.colorPalette.length]);
        const bgColors = values.map((_, i) => this.bgPalette[i % this.bgPalette.length]);

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Frecuencia',
                    data: values,
                    backgroundColor: bgColors,
                    borderColor: colors,
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: horizontal ? 'y' : 'x',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: !!title,
                        text: title,
                        font: { size: 14, weight: '600' },
                        color: '#e8ecf4',
                        padding: { bottom: 16 }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: { font: { size: 11 } }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { font: { size: 11 } }
                    }
                }
            }
        });
    }

    /**
     * Create scatter plot for bivariate analysis
     */
    createScatter(canvasId, data, labelX, labelY) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        this.charts[canvasId] = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: `${labelX} vs ${labelY}`,
                    data: data.points,
                    // Usamos un gradiente basado en la escala del tema
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) return 'rgba(124, 58, 237, 0.4)';
                        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        gradient.addColorStop(0, 'rgba(0, 212, 255, 0.5)'); // Cyan abajo
                        gradient.addColorStop(1, 'rgba(124, 58, 237, 0.6)'); // Purple arriba
                        return gradient;
                    },
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1,
                    pointRadius: 5,
                    pointHoverRadius: 9,
                    pointHoverBackgroundColor: 'rgba(255, 255, 255, 1)',
                    pointHoverBorderWidth: 3,
                    pointHoverBorderColor: 'rgba(0, 212, 255, 1)',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: `${labelX} vs ${labelY} (Pearson: ${data.correlation.toFixed(3)}${data.spearman !== undefined ? ', Spearman: ' + data.spearman.toFixed(3) : ''})`,
                        font: { size: 14, weight: '600' },
                        color: '#e8ecf4',
                        padding: { bottom: 16 }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: labelX, color: '#8892a8' },
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: { font: { size: 11 } }
                    },
                    y: {
                        title: { display: true, text: labelY, color: '#8892a8' },
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: { font: { size: 11 } }
                    }
                }
            }
        });
    }

    /**
     * Create pie / doughnut chart
     */
    createDoughnut(canvasId, labels, values, title) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        this.charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: this.colorPalette.slice(0, values.length),
                    borderColor: 'rgba(10, 14, 30, 0.8)',
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 12, font: { size: 11 } }
                    },
                    title: {
                        display: !!title,
                        text: title,
                        font: { size: 14, weight: '600' },
                        color: '#e8ecf4',
                        padding: { bottom: 16 }
                    }
                }
            }
        });
    }

    /**
     * Create box plot visualization (simulated with chart.js)
     */
    createBoxPlotSimulated(canvasId, statsObj, columns) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const labels = columns;

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Whisker Inferior (Min → Q1)',
                        data: columns.map(c => [statsObj[c]?.min ?? 0, statsObj[c]?.q1 ?? 0]),
                        backgroundColor: 'rgba(245, 158, 11, 0.2)',
                        borderColor: 'rgba(245, 158, 11, 0.6)',
                        borderWidth: 1,
                        borderRadius: 2,
                        borderSkipped: false,
                    },
                    {
                        label: 'IQR (Q1 → Q3)',
                        data: columns.map(c => [statsObj[c]?.q1 ?? 0, statsObj[c]?.q3 ?? 0]),
                        backgroundColor: 'rgba(0, 212, 255, 0.3)',
                        borderColor: 'rgba(0, 212, 255, 0.8)',
                        borderWidth: 2,
                        borderRadius: 4,
                        borderSkipped: false,
                    },
                    {
                        label: 'Whisker Superior (Q3 → Max)',
                        data: columns.map(c => [statsObj[c]?.q3 ?? 0, statsObj[c]?.max ?? 0]),
                        backgroundColor: 'rgba(124, 58, 237, 0.2)',
                        borderColor: 'rgba(124, 58, 237, 0.6)',
                        borderWidth: 1,
                        borderRadius: 2,
                        borderSkipped: false,
                    },
                    {
                        label: 'Mediana',
                        data: columns.map(c => {
                            const med = statsObj[c]?.median ?? 0;
                            return [med - 0.001, med + 0.001];
                        }),
                        backgroundColor: 'rgba(236, 72, 153, 0.9)',
                        borderColor: 'rgba(236, 72, 153, 1)',
                        borderWidth: 2,
                        borderSkipped: false,
                        barPercentage: 1.2,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    title: {
                        display: true,
                        text: 'Box Plot - Distribución de Variables Numéricas',
                        font: { size: 14, weight: '600' },
                        color: '#e8ecf4'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const col = context.label;
                                const ds = context.dataset.label;
                                if (Array.isArray(context.raw)) {
                                    return `${ds}: ${context.raw[0].toFixed(2)} → ${context.raw[1].toFixed(2)}`;
                                }
                                return `${ds}: ${context.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { font: { size: 11 }, maxRotation: 45 }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: { font: { size: 11 } }
                    }
                }
            }
        });
    }

    /**
     * Create correlation heatmap on canvas (manual drawing)
     */
    createCorrelationHeatmap(canvasId, corrData) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const cols = corrData.columns;
        const matrix = corrData.matrix;
        const n = cols.length;

        const cellSize = Math.min(60, Math.max(30, 500 / n));
        const labelSpace = 120;
        const topLabelSpace = 100;
        const width = labelSpace + n * cellSize + 60;
        const height = topLabelSpace + n * cellSize + 20;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);

        // Draw cells
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const val = matrix[i][j];
                const x = labelSpace + j * cellSize;
                const y = topLabelSpace + i * cellSize;

                ctx.fillStyle = this._getCorrelationColor(val);
                ctx.beginPath();
                ctx.roundRect(x + 1, y + 1, cellSize - 2, cellSize - 2, 3);
                ctx.fill();

                // Text
                if (cellSize >= 35) {
                    ctx.fillStyle = Math.abs(val) > 0.5 ? '#ffffff' : '#8892a8';
                    ctx.font = `${Math.min(11, cellSize * 0.22)}px 'JetBrains Mono', monospace`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(val.toFixed(2), x + cellSize / 2, y + cellSize / 2);
                }
            }
        }

        // Row labels
        ctx.fillStyle = '#e8ecf4';
        ctx.font = `${Math.min(12, cellSize * 0.25)}px 'Inter', sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < n; i++) {
            const label = cols[i].length > 15 ? cols[i].substring(0, 15) + '…' : cols[i];
            ctx.fillText(label, labelSpace - 8, topLabelSpace + i * cellSize + cellSize / 2);
        }

        // Column labels (rotated)
        ctx.save();
        ctx.textAlign = 'left';
        ctx.font = `${Math.min(12, cellSize * 0.25)}px 'Inter', sans-serif`;
        for (let j = 0; j < n; j++) {
            const label = cols[j].length > 15 ? cols[j].substring(0, 15) + '…' : cols[j];
            ctx.save();
            ctx.translate(labelSpace + j * cellSize + cellSize / 2, topLabelSpace - 8);
            ctx.rotate(-Math.PI / 3);
            ctx.fillText(label, 0, 0);
            ctx.restore();
        }
        ctx.restore();

        // Legend
        const legendX = labelSpace + n * cellSize + 15;
        const legendHeight = Math.min(n * cellSize, 200);
        const legendWidth = 15;
        const legendY = topLabelSpace;

        const gradient = ctx.createLinearGradient(0, legendY, 0, legendY + legendHeight);
        gradient.addColorStop(0, 'rgba(0, 212, 255, 0.9)');
        gradient.addColorStop(0.5, 'rgba(30, 30, 50, 0.3)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.9)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(legendX, legendY, legendWidth, legendHeight, 4);
        ctx.fill();

        ctx.fillStyle = '#8892a8';
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.textAlign = 'left';
        ctx.fillText('+1.0', legendX + legendWidth + 5, legendY + 6);
        ctx.fillText(' 0.0', legendX + legendWidth + 5, legendY + legendHeight / 2 + 3);
        ctx.fillText('-1.0', legendX + legendWidth + 5, legendY + legendHeight);
    }

    _getCorrelationColor(value) {
        const abs = Math.abs(value);
        if (value > 0) {
            // Cyan positive
            const r = Math.round(10 + (1 - abs) * 15);
            const g = Math.round(20 + abs * 192);
            const b = Math.round(40 + abs * 215);
            return `rgba(${r}, ${g}, ${b}, ${0.15 + abs * 0.7})`;
        } else {
            // Red negative
            const r = Math.round(20 + abs * 219);
            const g = Math.round(20 + (1 - abs) * 48);
            const b = Math.round(40 + (1 - abs) * 28);
            return `rgba(${r}, ${g}, ${b}, ${0.15 + abs * 0.7})`;
        }
    }

    /**
     * Create a missing values bar chart
     */
    createMissingChart(canvasId, missingData, headers) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const cols = headers.filter(h => missingData.byColumn[h].count > 0)
            .sort((a, b) => missingData.byColumn[b].count - missingData.byColumn[a].count);

        if (cols.length === 0) return;

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: cols.map(c => c.length > 20 ? c.substring(0, 20) + '…' : c),
                datasets: [{
                    label: 'Valores Faltantes',
                    data: cols.map(c => missingData.byColumn[c].count),
                    backgroundColor: cols.map((_, i) => {
                        const pct = missingData.byColumn[cols[i]].count / missingData.byColumn[cols[0]].count;
                        return pct > 0.5 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)';
                    }),
                    borderColor: cols.map((_, i) => {
                        const pct = missingData.byColumn[cols[i]].count / missingData.byColumn[cols[0]].count;
                        return pct > 0.5 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(245, 158, 11, 0.8)';
                    }),
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Valores Faltantes por Columna',
                        font: { size: 14, weight: '600' },
                        color: '#e8ecf4'
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.04)' }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { font: { size: 11 } }
                    }
                }
            }
        });
    }
}
