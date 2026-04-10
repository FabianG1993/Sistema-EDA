/* ========================================
   EDA Engine - Core Analysis Logic
   ======================================== */

class EDAEngine {
    constructor() {
        this.rawData = [];
        this.headers = [];
        this.data = [];
        this.columnTypes = {};
        this.numericColumns = [];
        this.categoricalColumns = [];
        this.mixedColumns = [];
        this.fileName = '';
        this._cache = {};
    }

    /** Clear analysis cache (call when data changes) */
    _clearCache() {
        this._cache = {};
    }

    /**
     * Parse CSV data using PapaParse
     */
    parseCSV(file) {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                encoding: 'UTF-8',
                complete: (results) => {
                    this.rawData = results.data;
                    this.headers = results.meta.fields || [];
                    this.data = results.data;
                    this.fileName = file.name || 'dataset.csv';
                    this._clearCache();
                    this._classifyColumns();
                    // Post-parse validation (B-02)
                    const warnings = [];
                    if (this.headers.some(h => h.trim() === '')) {
                        warnings.push('Se detectaron columnas sin nombre');
                    }
                    if (this.headers.length > 500) {
                        warnings.push('Número inusual de columnas, posible error de delimitador');
                    }
                    resolve({
                        data: this.data,
                        headers: this.headers,
                        rowCount: this.data.length,
                        colCount: this.headers.length,
                        errors: results.errors,
                        warnings
                    });
                },
                error: (err) => reject(err)
            });
        });
    }

    /**
     * Classify columns into numeric vs categorical
     */
    _classifyColumns() {
        this.columnTypes = {};
        this.numericColumns = [];
        this.categoricalColumns = [];

        this.headers.forEach(col => {
            let numCount = 0;
            let total = 0;
            for (let i = 0; i < this.data.length; i++) {
                const val = this.data[i][col];
                if (val !== null && val !== undefined && val !== '') {
                    total++;
                    if (typeof val === 'number' && !isNaN(val)) {
                        numCount++;
                    }
                }
            }
            const ratio = total > 0 ? numCount / total : 0;
            if (ratio > 0.95 && total > 0) {
                this.columnTypes[col] = 'numeric';
                this.numericColumns.push(col);
            } else if (ratio > 0.5 && total > 0) {
                this.columnTypes[col] = 'numeric';
                this.numericColumns.push(col);
                this.mixedColumns.push({ col, numericRatio: ratio });
            } else {
                this.columnTypes[col] = 'categorical';
                this.categoricalColumns.push(col);
            }
        });
    }

    /**
     * Get numeric values for a column (filtering nulls/NaN)
     */
    getNumericValues(col) {
        return this.data
            .map(row => row[col])
            .filter(v => v !== null && v !== undefined && v !== '' && typeof v === 'number' && !isNaN(v));
    }

    /**
     * 1. Structure & Dimensions
     */
    getStructure() {
        const memoryEstimate = this.data.length * this.headers.length * 20;
        const totalCells = this.data.length * this.headers.length;
        const nullCells = this.headers.reduce((sum, col) => {
            return sum + this.data.filter(r => r[col] === null || r[col] === undefined || r[col] === '').length;
        }, 0);
        const completeness = totalCells > 0 ? ((totalCells - nullCells) / totalCells * 100) : 100;

        return {
            rows: this.data.length,
            columns: this.headers.length,
            numericCols: this.numericColumns.length,
            categoricalCols: this.categoricalColumns.length,
            totalCells,
            nullCells,
            completeness: completeness.toFixed(1),
            memoryKB: (memoryEstimate / 1024).toFixed(1),
            headers: this.headers,
            columnList: this.headers.map(h => ({
                name: h,
                type: this.columnTypes[h],
                nonNull: this.data.filter(r => r[h] !== null && r[h] !== undefined && r[h] !== '').length,
                unique: new Set(this.data.map(r => r[h])).size
            }))
        };
    }

    /**
     * 2. Variable Types
     */
    getVariableTypes() {
        const types = {};
        this.headers.forEach(col => {
            const values = this.data.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '');
            const sampleSize = Math.min(values.length, 100);
            let intCount = 0, floatCount = 0, boolCount = 0, dateCount = 0;

            for (let i = 0; i < sampleSize; i++) {
                const v = values[i];
                if (typeof v === 'boolean') boolCount++;
                else if (typeof v === 'number') {
                    if (Number.isInteger(v)) intCount++;
                    else floatCount++;
                } else if (typeof v === 'string') {
                    if (/^\d{4}[-\/]\d{2}[-\/]\d{2}/.test(v)) dateCount++;
                }
            }

            const unique = new Set(values).size;
            const uniqueRatio = values.length > 0 ? unique / values.length : 0;

            let detailedType = 'text';
            if (this.columnTypes[col] === 'numeric') {
                detailedType = floatCount > intCount ? 'float' : 'integer';
            } else if (boolCount > sampleSize * 0.8) {
                detailedType = 'boolean';
            } else if (dateCount > sampleSize * 0.8) {
                detailedType = 'datetime';
            } else if (unique <= 20 || uniqueRatio < 0.05) {
                detailedType = 'categorical';
            }

            types[col] = {
                baseType: this.columnTypes[col],
                detailedType,
                uniqueValues: unique,
                uniqueRatio: (uniqueRatio * 100).toFixed(1),
                sampleValues: values.slice(0, 5)
            };
        });
        return types;
    }

    /**
     * 3. Missing Values
     */
    getMissingValues() {
        if (this._cache.missing) return this._cache.missing;
        const result = {};
        let totalMissing = 0;
        this.headers.forEach(col => {
            const missing = this.data.filter(r => r[col] === null || r[col] === undefined || r[col] === '').length;
            totalMissing += missing;
            result[col] = {
                count: missing,
                percentage: ((missing / this.data.length) * 100).toFixed(2),
                nonNull: this.data.length - missing
            };
        });

        const totalCells = this.data.length * this.headers.length;
        const output = {
            byColumn: result,
            totalMissing,
            totalCells,
            overallPercentage: ((totalMissing / totalCells) * 100).toFixed(2),
            columnsWithMissing: Object.keys(result).filter(k => result[k].count > 0).length,
            completeRows: this.data.filter(row => this.headers.every(h => row[h] !== null && row[h] !== undefined && row[h] !== '')).length
        };
        this._cache.missing = output;
        return output;
    }

    /**
     * 4. Descriptive Statistics
     */
    getDescriptiveStats() {
        if (this._cache.descriptive) return this._cache.descriptive;
        const numericStats = {};
        const categoricalStats = {};

        this.numericColumns.forEach(col => {
            const vals = this.getNumericValues(col);
            if (vals.length === 0) return;

            const sorted = [...vals].sort((a, b) => a - b);
            const n = sorted.length;
            const sum = vals.reduce((s, v) => s + v, 0);
            const mean = sum / n;
            const variance = n > 1 ? vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (n - 1) : 0;
            const std = Math.sqrt(variance);

            const q1 = this._percentile(sorted, 25);
            const median = this._percentile(sorted, 50);
            const q3 = this._percentile(sorted, 75);
            const iqr = q3 - q1;

            const skewness = (n > 2 && std > 0) ? (n / ((n - 1) * (n - 2))) * vals.reduce((s, v) => s + Math.pow((v - mean) / std, 3), 0) : 0;
            const kurtosis = (n > 3 && std > 0) ? ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * vals.reduce((s, v) => s + Math.pow((v - mean) / std, 4), 0) - (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3)) : 0;

            numericStats[col] = {
                count: n,
                mean: mean,
                std: std,
                min: sorted[0],
                q1, median, q3,
                max: sorted[n - 1],
                iqr,
                range: sorted[n - 1] - sorted[0],
                skewness,
                kurtosis,
                cv: mean !== 0 ? (std / Math.abs(mean) * 100) : 0
            };
        });

        this.categoricalColumns.forEach(col => {
            const values = this.data.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '');
            const freq = {};
            values.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
            const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
            const unique = Object.keys(freq).length;

            categoricalStats[col] = {
                count: values.length,
                unique,
                mode: sorted.length > 0 ? sorted[0][0] : null,
                modeFreq: sorted.length > 0 ? sorted[0][1] : 0,
                topValues: sorted.slice(0, 10).map(([val, count]) => ({
                    value: val,
                    count,
                    percentage: ((count / values.length) * 100).toFixed(1)
                }))
            };
        });

        const output = { numericStats, categoricalStats };
        this._cache.descriptive = output;
        return output;
    }

    /**
     * 5. Distribution Analysis (Univariate)
     */
    getDistribution(col) {
        if (this.columnTypes[col] === 'numeric') {
            const vals = this.getNumericValues(col);
            if (vals.length === 0) return null;

            const min = EDAEngine._safeMin(vals);
            const max = EDAEngine._safeMax(vals);
            const binCount = Math.min(Math.ceil(Math.sqrt(vals.length)), 50);
            const binWidth = (max - min) / binCount || 1;

            const bins = [];
            for (let i = 0; i < binCount; i++) {
                const lower = min + i * binWidth;
                const upper = lower + binWidth;
                bins.push({
                    lower: parseFloat(lower.toFixed(4)),
                    upper: parseFloat(upper.toFixed(4)),
                    count: 0,
                    label: `${lower.toFixed(1)}-${upper.toFixed(1)}`
                });
            }

            vals.forEach(v => {
                let idx = Math.floor((v - min) / binWidth);
                if (idx >= binCount) idx = binCount - 1;
                if (idx < 0) idx = 0;
                bins[idx].count++;
            });

            return { type: 'numeric', bins, values: vals };
        } else {
            const values = this.data.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '');
            const freq = {};
            values.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
            const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);

            return {
                type: 'categorical',
                categories: sorted.slice(0, 20).map(([val, count]) => ({
                    value: String(val).substring(0, 30),
                    count,
                    percentage: ((count / values.length) * 100).toFixed(1)
                })),
                totalUnique: Object.keys(freq).length
            };
        }
    }

    /**
     * 6. Outlier Detection (IQR method)
     */
    getOutliers() {
        if (this._cache.outliers) return this._cache.outliers;
        const results = {};
        let totalOutliers = 0;

        this.numericColumns.forEach(col => {
            const vals = this.getNumericValues(col);
            if (vals.length < 4) return;

            const sorted = [...vals].sort((a, b) => a - b);
            const q1 = this._percentile(sorted, 25);
            const q3 = this._percentile(sorted, 75);
            const iqr = q3 - q1;
            const lowerBound = q1 - 1.5 * iqr;
            const upperBound = q3 + 1.5 * iqr;

            const outliers = vals.filter(v => v < lowerBound || v > upperBound);
            totalOutliers += outliers.length;

            results[col] = {
                count: outliers.length,
                percentage: ((outliers.length / vals.length) * 100).toFixed(2),
                q1, q3, iqr,
                lowerBound: parseFloat(lowerBound.toFixed(4)),
                upperBound: parseFloat(upperBound.toFixed(4)),
                outlierValues: outliers.slice(0, 20).map(v => parseFloat(v.toFixed(4))),
                min: EDAEngine._safeMin(vals),
                max: EDAEngine._safeMax(vals)
            };
        });

        const output = {
            byColumn: results,
            totalOutliers,
            columnsWithOutliers: Object.keys(results).filter(k => results[k].count > 0).length
        };
        this._cache.outliers = output;
        return output;
    }

    /**
     * 7. Bivariate Analysis
     */
    getBivariateData(colX, colY) {
        const points = [];
        this.data.forEach(row => {
            const x = row[colX];
            const y = row[colY];
            if (x !== null && x !== undefined && x !== '' && y !== null && y !== undefined && y !== '') {
                if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
                    points.push({ x, y });
                }
            }
        });

        // Deterministic sampling for large datasets (M-03)
        const maxPoints = 500;
        let sampled;
        if (points.length > maxPoints) {
            const step = points.length / maxPoints;
            sampled = [];
            for (let i = 0; i < maxPoints; i++) {
                sampled.push(points[Math.floor(i * step)]);
            }
        } else {
            sampled = points;
        }

        return {
            points: sampled,
            correlation: this._pearsonCorrelation(colX, colY),
            spearman: this._spearmanCorrelation(colX, colY),
            totalPoints: points.length
        };
    }

    /**
     * 8. Correlation Matrix
     */
    getCorrelationMatrix() {
        if (this._cache.correlation) return this._cache.correlation;
        const cols = this.numericColumns.slice(0, 20); // Limit for performance
        const matrix = [];

        for (let i = 0; i < cols.length; i++) {
            const row = [];
            for (let j = 0; j < cols.length; j++) {
                if (i === j) {
                    row.push(1);
                } else if (j < i) {
                    row.push(matrix[j][i]); // symmetric
                } else {
                    row.push(this._pearsonCorrelation(cols[i], cols[j]));
                }
            }
            matrix.push(row);
        }

        // Find strongest correlations
        const strongCorrelations = [];
        for (let i = 0; i < cols.length; i++) {
            for (let j = i + 1; j < cols.length; j++) {
                const val = matrix[i][j];
                if (Math.abs(val) > 0.5) {
                    strongCorrelations.push({
                        col1: cols[i],
                        col2: cols[j],
                        correlation: parseFloat(val.toFixed(4)),
                        strength: Math.abs(val) > 0.8 ? 'Fuerte' : 'Moderada',
                        direction: val > 0 ? 'Positiva' : 'Negativa'
                    });
                }
            }
        }
        strongCorrelations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

        const output = { columns: cols, matrix, strongCorrelations };
        this._cache.correlation = output;
        return output;
    }

    /**
     * 9. Duplicate Detection
     */
    getDuplicates() {
        if (this._cache.duplicates) return this._cache.duplicates;
        const seen = new Map();
        const duplicateIndices = [];
        let duplicateCount = 0;

        this.data.forEach((row, idx) => {
            // Efficient key generation without JSON.stringify (M-05)
            let key = '';
            for (let c = 0; c < this.headers.length; c++) {
                const val = row[this.headers[c]];
                key += (val === null || val === undefined ? '\x00' : String(val)) + '\x01';
            }
            if (seen.has(key)) {
                duplicateCount++;
                duplicateIndices.push(idx);
            } else {
                seen.set(key, idx);
            }
        });

        // Find near-duplicates (same values in key columns)
        const subsetDuplicates = {};
        if (this.headers.length >= 2) {
            const keyCols = this.headers.slice(0, Math.min(3, this.headers.length));
            const seenSubset = new Map();
            let subCount = 0;
            this.data.forEach((row, idx) => {
                const key = keyCols.map(c => row[c]).join('||');
                if (seenSubset.has(key)) {
                    subCount++;
                } else {
                    seenSubset.set(key, idx);
                }
            });
            subsetDuplicates.count = subCount;
            subsetDuplicates.columns = keyCols;
        }

        const output = {
            exactDuplicates: duplicateCount,
            duplicatePercentage: ((duplicateCount / this.data.length) * 100).toFixed(2),
            uniqueRows: this.data.length - duplicateCount,
            sampleDuplicateIndices: duplicateIndices.slice(0, 10),
            subsetDuplicates
        };
        this._cache.duplicates = output;
        return output;
    }

    /**
     * 10. Data Quality Assessment
     */
    getQualityAssessment() {
        const checks = [];
        let score = 100;

        // Completeness check
        const missing = this.getMissingValues();
        const completeness = 100 - parseFloat(missing.overallPercentage);
        checks.push({
            name: 'Completitud de datos',
            status: completeness > 95 ? 'pass' : completeness > 80 ? 'warn' : 'fail',
            value: `${completeness.toFixed(1)}%`,
            detail: `${missing.totalMissing} valores faltantes de ${missing.totalCells}`
        });
        if (completeness < 95) score -= (95 - completeness) * 0.5;

        // Duplicate check
        const dups = this.getDuplicates();
        const dupPct = parseFloat(dups.duplicatePercentage);
        checks.push({
            name: 'Sin duplicados',
            status: dupPct === 0 ? 'pass' : dupPct < 5 ? 'warn' : 'fail',
            value: `${dups.exactDuplicates} duplicados`,
            detail: `${dupPct}% del dataset`
        });
        if (dupPct > 0) score -= Math.min(dupPct * 2, 15);

        // Outlier check
        const outliers = this.getOutliers();
        const outlierPct = this.numericColumns.length > 0
            ? (outliers.totalOutliers / (this.data.length * this.numericColumns.length) * 100)
            : 0;
        checks.push({
            name: 'Control de outliers',
            status: outlierPct < 2 ? 'pass' : outlierPct < 10 ? 'warn' : 'fail',
            value: `${outliers.totalOutliers} outliers`,
            detail: `${outlierPct.toFixed(1)}% de valores numéricos`
        });
        if (outlierPct > 5) score -= Math.min(outlierPct, 10);

        // Consistency - check if numeric columns have consistent types
        let inconsistentCols = 0;
        this.headers.forEach(col => {
            const types = new Set();
            this.data.slice(0, 100).forEach(row => {
                const v = row[col];
                if (v !== null && v !== undefined && v !== '') {
                    types.add(typeof v);
                }
            });
            if (types.size > 1) inconsistentCols++;
        });
        checks.push({
            name: 'Consistencia de tipos',
            status: inconsistentCols === 0 ? 'pass' : inconsistentCols <= 2 ? 'warn' : 'fail',
            value: `${this.headers.length - inconsistentCols}/${this.headers.length} consistentes`,
            detail: inconsistentCols > 0 ? `${inconsistentCols} columnas con tipos mixtos` : 'Todos los tipos son consistentes'
        });
        if (inconsistentCols > 0) score -= inconsistentCols * 3;

        // Cardinality check
        let highCardCols = 0;
        this.categoricalColumns.forEach(col => {
            const unique = new Set(this.data.map(r => r[col])).size;
            if (unique > this.data.length * 0.9) highCardCols++;
        });
        checks.push({
            name: 'Cardinalidad razonable',
            status: highCardCols === 0 ? 'pass' : 'warn',
            value: `${highCardCols} columnas alta cardinalidad`,
            detail: highCardCols > 0 ? 'Posibles IDs o texto libre' : 'Cardinalidad bajo control'
        });
        if (highCardCols > 0) score -= highCardCols * 2;

        // Balance check for categorical
        let imbalancedCols = 0;
        this.categoricalColumns.slice(0, 10).forEach(col => {
            const values = this.data.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '');
            const freq = {};
            values.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
            const counts = Object.values(freq);
            if (counts.length > 1) {
                const maxC = Math.max(...counts);
                const minC = Math.min(...counts);
                if (maxC > minC * 10) imbalancedCols++;
            }
        });
        checks.push({
            name: 'Balance de clases',
            status: imbalancedCols === 0 ? 'pass' : 'warn',
            value: `${imbalancedCols} variables desbalanceadas`,
            detail: imbalancedCols > 0 ? 'Considerar técnicas de balanceo' : 'Las clases están razonablemente balanceadas'
        });

        // Sample size
        checks.push({
            name: 'Tamaño de muestra',
            status: this.data.length > 100 ? 'pass' : this.data.length > 30 ? 'warn' : 'fail',
            value: `${this.data.length} filas`,
            detail: this.data.length > 100 ? 'Tamaño adecuado para análisis' : 'Muestra pequeña, resultados limitados'
        });
        if (this.data.length < 30) score -= 10;

        score = Math.max(0, Math.min(100, Math.round(score)));

        return { score, checks };
    }

    /**
     * 11. Generate Findings
     */
    getFindings() {
        const findings = [];
        const structure = this.getStructure();
        const missing = this.getMissingValues();
        const stats = this.getDescriptiveStats();
        const outliers = this.getOutliers();
        const corr = this.getCorrelationMatrix();
        const dups = this.getDuplicates();

        // Dataset size
        findings.push({
            icon: 'fas fa-database',
            iconClass: 'cyan',
            title: 'Dimensiones del Dataset',
            description: `El dataset contiene ${structure.rows.toLocaleString()} filas y ${structure.columns} columnas (${structure.numericCols} numéricas, ${structure.categoricalCols} categóricas). Completitud general: ${structure.completeness}%.`
        });

        // Missing values
        if (missing.totalMissing > 0) {
            const worstCol = Object.entries(missing.byColumn).sort((a, b) => b[1].count - a[1].count)[0];
            findings.push({
                icon: 'fas fa-exclamation-triangle',
                iconClass: 'orange',
                title: 'Datos Faltantes Detectados',
                description: `Se encontraron ${missing.totalMissing.toLocaleString()} valores nulos (${missing.overallPercentage}%). La columna con más valores faltantes es "${worstCol[0]}" con ${worstCol[1].count} (${worstCol[1].percentage}%).`
            });
        } else {
            findings.push({
                icon: 'fas fa-check-circle',
                iconClass: 'green',
                title: 'Sin Datos Faltantes',
                description: 'El dataset está completo, no se detectaron valores nulos o faltantes en ninguna columna.'
            });
        }

        // Outliers
        if (outliers.totalOutliers > 0) {
            const worstOutlier = Object.entries(outliers.byColumn)
                .filter(([, v]) => v.count > 0)
                .sort((a, b) => b[1].count - a[1].count)[0];
            findings.push({
                icon: 'fas fa-dot-circle',
                iconClass: 'red',
                title: 'Valores Atípicos Identificados',
                description: `Se detectaron ${outliers.totalOutliers} outliers en ${outliers.columnsWithOutliers} columnas. La más afectada es "${worstOutlier[0]}" con ${worstOutlier[1].count} outliers (${worstOutlier[1].percentage}%).`
            });
        }

        // Strong correlations
        if (corr.strongCorrelations.length > 0) {
            const top = corr.strongCorrelations[0];
            findings.push({
                icon: 'fas fa-link',
                iconClass: 'purple',
                title: 'Correlaciones Significativas',
                description: `Se encontraron ${corr.strongCorrelations.length} pares de variables con correlación significativa (|r| > 0.5). La más fuerte es entre "${top.col1}" y "${top.col2}" (r = ${top.correlation}).`
            });
        }

        // Duplicates
        if (dups.exactDuplicates > 0) {
            findings.push({
                icon: 'fas fa-clone',
                iconClass: 'orange',
                title: 'Filas Duplicadas',
                description: `Se detectaron ${dups.exactDuplicates} filas duplicadas exactas (${dups.duplicatePercentage}% del dataset). Se recomienda evaluar si deben eliminarse.`
            });
        }

        // Skewness
        const skewedCols = Object.entries(stats.numericStats)
            .filter(([, s]) => Math.abs(s.skewness) > 1)
            .sort((a, b) => Math.abs(b[1].skewness) - Math.abs(a[1].skewness));

        if (skewedCols.length > 0) {
            findings.push({
                icon: 'fas fa-chart-area',
                iconClass: 'pink',
                title: 'Distribuciones Asimétricas',
                description: `${skewedCols.length} variables numéricas muestran asimetría significativa (|skewness| > 1). La más asimétrica es "${skewedCols[0][0]}" (skew = ${skewedCols[0][1].skewness.toFixed(2)}). Considerar transformaciones logarítmicas o Box-Cox.`
            });
        }

        // High CV
        const highCV = Object.entries(stats.numericStats)
            .filter(([, s]) => s.cv > 100)
            .sort((a, b) => b[1].cv - a[1].cv);

        if (highCV.length > 0) {
            findings.push({
                icon: 'fas fa-arrows-alt-v',
                iconClass: 'orange',
                title: 'Alta Variabilidad',
                description: `${highCV.length} variables presentan coeficiente de variación > 100%, indicando alta dispersión. La variable "${highCV[0][0]}" tiene un CV de ${highCV[0][1].cv.toFixed(1)}%. Considerar normalización/estandarización.`
            });
        }

        return findings;
    }

    /**
     * 12. Generate Next Steps
     */
    getNextSteps() {
        const steps = [];
        const missing = this.getMissingValues();
        const outliers = this.getOutliers();
        const stats = this.getDescriptiveStats();
        const corr = this.getCorrelationMatrix();
        const dups = this.getDuplicates();

        let stepNum = 1;

        // Data Cleaning
        if (missing.totalMissing > 0 || dups.exactDuplicates > 0) {
            steps.push({
                num: stepNum++,
                title: 'Limpieza de Datos',
                description: `${missing.totalMissing > 0 ? `Imputar o eliminar ${missing.totalMissing} valores faltantes. ` : ''}${dups.exactDuplicates > 0 ? `Eliminar ${dups.exactDuplicates} filas duplicadas.` : ''} Considerar KNN Imputer o SimpleImputer de scikit-learn.`
            });
        }

        // Outlier treatment
        if (outliers.totalOutliers > 0) {
            steps.push({
                num: stepNum++,
                title: 'Tratamiento de Outliers',
                description: `Evaluar los ${outliers.totalOutliers} outliers detectados. Opciones: winsorización, transformación logarítmica, eliminación o mantenerlos si son valores válidos del dominio.`
            });
        }

        // Feature Engineering
        const skewedCols = Object.entries(stats.numericStats).filter(([, s]) => Math.abs(s.skewness) > 1);
        steps.push({
            num: stepNum++,
            title: 'Feature Engineering',
            description: `Crear nuevas variables derivadas. ${skewedCols.length > 0 ? `Aplicar transformaciones (log, sqrt, Box-Cox) a las ${skewedCols.length} variables asimétricas.` : ''} Considerar interacciones entre variables y encoding de categóricas (OneHot/Label).`
        });

        // Multicollinearity
        if (corr.strongCorrelations.length > 0) {
            const veryStrong = corr.strongCorrelations.filter(c => Math.abs(c.correlation) > 0.8);
            if (veryStrong.length > 0) {
                steps.push({
                    num: stepNum++,
                    title: 'Reducir Multicolinealidad',
                    description: `Se detectaron ${veryStrong.length} pares con correlación > 0.8. Considerar eliminar variables redundantes, PCA, o VIF (Variance Inflation Factor) para selección de features.`
                });
            }
        }

        // Scaling
        steps.push({
            num: stepNum++,
            title: 'Escalado de Variables',
            description: 'Aplicar StandardScaler o MinMaxScaler antes de modelar. Variables con diferentes escalas pueden afectar el rendimiento de modelos como SVM, KNN o redes neuronales.'
        });

        // Encoding
        if (this.categoricalColumns.length > 0) {
            steps.push({
                num: stepNum++,
                title: 'Encoding de Variables Categóricas',
                description: `Codificar las ${this.categoricalColumns.length} variables categóricas. Usar One-Hot Encoding para baja cardinalidad y Target Encoding o Label Encoding para alta cardinalidad.`
            });
        }

        // Modeling
        steps.push({
            num: stepNum++,
            title: 'Selección de Modelo',
            description: `Con ${this.data.length} muestras y ${this.headers.length} features, considerar: Random Forest, XGBoost/LightGBM como baselines robustos. Implementar validación cruzada (k-fold) para evaluación confiable.`
        });

        // Validation
        steps.push({
            num: stepNum++,
            title: 'Validación y Evaluación',
            description: 'Dividir en train/test (80/20). Usar métricas apropiadas: RMSE/MAE para regresión, F1-Score/AUC-ROC para clasificación. Implementar early stopping y regularización para evitar overfitting.'
        });

        return steps;
    }

    /* ========================================
       Utility Methods
       ======================================== */

    _percentile(sortedArr, p) {
        const idx = (p / 100) * (sortedArr.length - 1);
        const lower = Math.floor(idx);
        const upper = Math.ceil(idx);
        if (lower === upper) return sortedArr[lower];
        return sortedArr[lower] + (idx - lower) * (sortedArr[upper] - sortedArr[lower]);
    }

    _pearsonCorrelation(colX, colY) {
        const pairs = [];
        this.data.forEach(row => {
            const x = row[colX];
            const y = row[colY];
            if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
                pairs.push([x, y]);
            }
        });

        if (pairs.length < 3) return 0;

        const n = pairs.length;
        const sumX = pairs.reduce((s, p) => s + p[0], 0);
        const sumY = pairs.reduce((s, p) => s + p[1], 0);
        const sumXY = pairs.reduce((s, p) => s + p[0] * p[1], 0);
        const sumX2 = pairs.reduce((s, p) => s + p[0] * p[0], 0);
        const sumY2 = pairs.reduce((s, p) => s + p[1] * p[1], 0);

        const num = n * sumXY - sumX * sumY;
        const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

        if (den === 0) return 0;
        return num / den;
    }

    /**
     * Format number for display
     */
    static formatNumber(num, decimals = 2) {
        if (num === null || num === undefined || isNaN(num)) return '-';
        if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return parseFloat(num.toFixed(decimals)).toString();
    }

    /** Safe minimum without stack overflow for large arrays (C-05) */
    static _safeMin(arr) {
        let min = Infinity;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] < min) min = arr[i];
        }
        return min;
    }

    /** Safe maximum without stack overflow for large arrays (C-05) */
    static _safeMax(arr) {
        let max = -Infinity;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] > max) max = arr[i];
        }
        return max;
    }

    /**
     * Spearman rank correlation (C-04)
     */
    _spearmanCorrelation(colX, colY) {
        const pairs = [];
        this.data.forEach(row => {
            const x = row[colX];
            const y = row[colY];
            if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
                pairs.push([x, y]);
            }
        });
        if (pairs.length < 3) return 0;

        const rankX = EDAEngine._rank(pairs.map(p => p[0]));
        const rankY = EDAEngine._rank(pairs.map(p => p[1]));

        const n = rankX.length;
        const sumD2 = rankX.reduce((s, rx, i) => s + Math.pow(rx - rankY[i], 2), 0);
        return 1 - (6 * sumD2) / (n * (n * n - 1));
    }

    static _rank(arr) {
        const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
        const ranks = new Array(arr.length);
        let i = 0;
        while (i < sorted.length) {
            let j = i;
            while (j < sorted.length && sorted[j].v === sorted[i].v) j++;
            const avgRank = (i + j + 1) / 2;
            for (let k = i; k < j; k++) ranks[sorted[k].i] = avgRank;
            i = j;
        }
        return ranks;
    }
}
