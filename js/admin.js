const STORAGE_KEY = 'conductores_pendientes';

document.addEventListener('DOMContentLoaded', function() {
	const tbody = document.getElementById('tbodyConductores');
	const filtroFecha = document.getElementById('filtroFecha');
	const btnFiltrar = document.getElementById('btnFiltrar');
	const btnLimpiarFiltro = document.getElementById('btnLimpiarFiltro');
	const btnExportarExcel = document.getElementById('btnExportarExcel');
	const totalRegistros = document.getElementById('totalRegistros');
	const registrosMostrados = document.getElementById('registrosMostrados');

	let datosFiltrados = [];
	let fechaFiltro = null;

	cargarDatos();

	btnFiltrar.addEventListener('click', function() {
		fechaFiltro = filtroFecha.value;
		if (fechaFiltro) {
			filtrarPorFecha(fechaFiltro);
		} else {
			alert('Por favor, seleccione una fecha');
		}
	});

	btnLimpiarFiltro.addEventListener('click', function() {
		filtroFecha.value = '';
		fechaFiltro = null;
		cargarDatos();
	});

	btnExportarExcel.addEventListener('click', function() {
		exportarACSV();
	});

	function obtenerDatosDelStorage() {
		try {
			const datos = localStorage.getItem(STORAGE_KEY);
			return datos ? JSON.parse(datos) : [];
		} catch (error) {
			console.error('Error al leer localStorage:', error);
			return [];
		}
	}

	function cargarDatos() {
		const conductores = obtenerDatosDelStorage();
		// Ordenar por fecha descendente (más recientes primero)
		conductores.sort(function(a, b) {
			return new Date(b.timestamp) - new Date(a.timestamp);
		});
		
		totalRegistros.textContent = conductores.length;
		
		if (fechaFiltro) {
			filtrarPorFecha(fechaFiltro);
		} else {
			datosFiltrados = conductores;
			renderizarTabla(conductores);
		}
	}

	function filtrarPorFecha(fecha) {
		const todosLosDatos = obtenerDatosDelStorage();
		// Ordenar por fecha descendente (más recientes primero)
		todosLosDatos.sort(function(a, b) {
			return new Date(b.timestamp) - new Date(a.timestamp);
		});
		
		const fechaInicio = new Date(fecha);
		fechaInicio.setHours(0, 0, 0, 0);
		
		const fechaFin = new Date(fecha);
		fechaFin.setHours(23, 59, 59, 999);

		datosFiltrados = todosLosDatos.filter(function(conductor) {
			const fechaRegistro = new Date(conductor.timestamp);
			return fechaRegistro >= fechaInicio && fechaRegistro <= fechaFin;
		});

		registrosMostrados.textContent = datosFiltrados.length;
		renderizarTabla(datosFiltrados);
	}

	function renderizarTabla(datos) {
		if (datos.length === 0) {
			tbody.innerHTML = '<tr><td colspan="10" class="no-data">No hay datos disponibles</td></tr>';
			registrosMostrados.textContent = '0';
			return;
		}

		tbody.innerHTML = '';

		datos.forEach(function(conductor) {
			const fila = document.createElement('tr');
			const fecha = new Date(conductor.timestamp);
			const fechaFormateada = fecha.toLocaleDateString('es-ES', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit'
			});

			fila.innerHTML = `
				<td>${fechaFormateada}</td>
				<td>${conductor.nombreApellido || '-'}</td>
				<td>${conductor.patente || '-'}</td>
				<td>${conductor.ruta || '-'}</td>
				<td>${conductor.numeroPaquetes || '-'}</td>
				<td>${conductor.paquetesRecibidos || '-'}</td>
				<td>${conductor.cantidadParadas || '-'}</td>
				<td>${conductor.paquetesEntregados || '-'}</td>
				<td>${conductor.paquetesDevueltos || '-'}</td>
				<td>${conductor.observaciones || '-'}</td>
			`;

			tbody.appendChild(fila);
		});

		if (!fechaFiltro) {
			registrosMostrados.textContent = datos.length;
		}
	}

	function exportarACSV() {
		try {
			let datosParaExportar = datosFiltrados;
			
			if (!fechaFiltro && datosFiltrados.length === 0) {
				datosParaExportar = obtenerDatosDelStorage();
			}

			if (datosParaExportar.length === 0) {
				alert('No hay datos para exportar');
				return;
			}

			// Ordenar por fecha descendente (más recientes primero)
			datosParaExportar.sort(function(a, b) {
				return new Date(b.timestamp) - new Date(a.timestamp);
			});

			// Encabezados del CSV
			const encabezados = [
				'Fecha',
				'Nombre y Apellido',
				'Patente',
				'Ruta',
				'Número de Paquetes',
				'Paquetes Recibidos',
				'Cantidad de Paradas',
				'Paquetes Entregados',
				'Paquetes Devueltos',
				'Observaciones'
			];

			// Convertir datos a filas CSV
			const filas = datosParaExportar.map(function(conductor) {
				const fecha = new Date(conductor.timestamp);
				const fechaFormateada = fecha.toLocaleDateString('es-ES', {
					year: 'numeric',
					month: '2-digit',
					day: '2-digit',
					hour: '2-digit',
					minute: '2-digit'
				});

				return [
					fechaFormateada,
					conductor.nombreApellido || '',
					conductor.patente || '',
					conductor.ruta || '',
					conductor.numeroPaquetes || '',
					conductor.paquetesRecibidos || '',
					conductor.cantidadParadas || '',
					conductor.paquetesEntregados || '',
					conductor.paquetesDevueltos || '',
					(conductor.observaciones || '').replace(/"/g, '""') // Escapar comillas dobles
				];
			});

			// Función para escapar valores CSV
			function escaparCSV(valor) {
				if (valor === null || valor === undefined) {
					return '';
				}
				const string = String(valor);
				if (string.includes(',') || string.includes('"') || string.includes('\n')) {
					return `"${string.replace(/"/g, '""')}"`;
				}
				return string;
			}

			// Construir contenido CSV
			const contenidoCSV = [
				encabezados.map(escaparCSV).join(','),
				...filas.map(function(fila) {
					return fila.map(escaparCSV).join(',');
				})
			].join('\n');

			// Crear blob y descargar
			const blob = new Blob(['\ufeff' + contenidoCSV], { type: 'text/csv;charset=utf-8;' }); // BOM para Excel
			const link = document.createElement('a');
			const url = URL.createObjectURL(blob);

			const fechaActual = new Date().toISOString().split('T')[0];
			const nombreArchivo = fechaFiltro 
				? `conductores_${fechaFiltro}.csv` 
				: `conductores_${fechaActual}.csv`;

			link.setAttribute('href', url);
			link.setAttribute('download', nombreArchivo);
			link.style.visibility = 'hidden';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			console.log('CSV exportado correctamente:', nombreArchivo);
		} catch (error) {
			console.error('Error al exportar a CSV:', error);
			alert('Error al exportar el archivo CSV');
		}
	}
});
