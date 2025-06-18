let calendar;

document.addEventListener('DOMContentLoaded', () => {
    const calendarEl = document.getElementById('calendar');

    calendar = new FullCalendar.Calendar(calendarEl, {
        locale: 'es',
        initialView: 'dayGridMonth',
        buttonText: {
          today: 'Hoy', 
          month: 'Mes',
          week: 'Semana',
          day: 'Día',
          list: 'Agenda'
        },
        events: async () => {
            try {
                const res = await fetch('/api/fechas-ocupadas');
                if (!res.ok) throw new Error('Error al cargar las fechas');
                const fechas = await res.json();

                // Validar formato de los datos
                if (!Array.isArray(fechas)) {
                    throw new Error('El formato de los datos no es válido');
                }

                // Crear eventos para el calendario
                return fechas.map(({ fecha, cantidad }) => {
                    let color;

                    // Asignar colores según la cantidad de reservas
                    if (cantidad === 1) color = '#FFFF00';
                    else if (cantidad >= 2) color = '#FF0000';
                    else color = '#FFFFFF';

                    return {
                        start: fecha,
                        display: 'background',
                        backgroundColor: color,
                    };
                });
            } catch (error) {
                console.error('Error al cargar eventos:', error);
                return [];
            }
        },
    });

    calendar.render();
});


document.addEventListener('DOMContentLoaded', function() {
    // Elementos del carrusel
    const testimonios = document.querySelectorAll('.testimonio');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.querySelector('.prev-testimonio');
    const nextBtn = document.querySelector('.next-testimonio');
    const sliderContainer = document.querySelector('.testimonios-slider');
    
    let currentTestimonio = 0;
    let isAnimating = false;
    let autoSlideInterval;

    // Función mejorada para cambiar testimonios
    function showTestimonio(newIndex) {
        if (isAnimating) return;
        isAnimating = true;
        
        // Ajustar índice si está fuera de rango
        if (newIndex >= testimonios.length) newIndex = 0;
        if (newIndex < 0) newIndex = testimonios.length - 1;
        
        const currentActive = document.querySelector('.testimonio.active');
        const nextTestimonio = testimonios[newIndex];
        
        // Fade out del testimonio actual
        if (currentActive) {
            currentActive.style.opacity = '0';
            
            setTimeout(() => {
                currentActive.classList.remove('active');
                
                // Fade in del nuevo testimonio
                nextTestimonio.classList.add('active');
                setTimeout(() => {
                    nextTestimonio.style.opacity = '1';
                    
                    // Actualizar estado y puntos
                    currentTestimonio = newIndex;
                    updateDots();
                    isAnimating = false;
                }, 20);
            }, 300); // Tiempo de la animación de fade out
        }
    }

    // Actualizar puntos indicadores
    function updateDots() {
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentTestimonio);
        });
    }

    // Navegación
    function nextTestimonio() {
        showTestimonio(currentTestimonio + 1);
        resetAutoSlide();
    }

    function prevTestimonio() {
        showTestimonio(currentTestimonio - 1);
        resetAutoSlide();
    }

    // Event listeners
    nextBtn.addEventListener('click', nextTestimonio);
    prevBtn.addEventListener('click', prevTestimonio);

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            if (index !== currentTestimonio) {
                showTestimonio(index);
                resetAutoSlide();
            }
        });
    });

    // Auto-desplazamiento
    function startAutoSlide() {
        autoSlideInterval = setInterval(nextTestimonio, 5000);
    }

    function resetAutoSlide() {
        clearInterval(autoSlideInterval);
        startAutoSlide();
    }

    // Precargar todos los testimonios
    function preloadTestimonios() {
        testimonios.forEach(testimonio => {
            testimonio.style.display = 'block';
            testimonio.style.opacity = '0';
            testimonio.style.transition = 'opacity 0.5s ease';
        });
    }

    // Inicialización
    function init() {
        preloadTestimonios();
        testimonios[currentTestimonio].classList.add('active');
        testimonios[currentTestimonio].style.opacity = '1';
        updateDots();
        startAutoSlide();
        
        // Pausar al interactuar
        sliderContainer.addEventListener('mouseenter', () => clearInterval(autoSlideInterval));
        sliderContainer.addEventListener('mouseleave', startAutoSlide);
    }

    init();
});
function showSection(sectionId) {
    // Busca el elemento de la sección por su ID
    const section = document.getElementById(sectionId);

    // Si la sección existe, realiza el scroll
    if (section) {
        section.scrollIntoView({
            behavior: "smooth", // Desplazamiento suave
            block: "start" // Alinea la sección al inicio del viewport
        });
    }
}
window.addEventListener("scroll", function () {
    const header = document.querySelector("header");

    // Cambia la clase del header cuando el scroll supera los 100px
    if (window.scrollY > 100) {
        header.classList.add("abajo");
    } else {
        header.classList.remove("abajo");
    }
});

// Agrega event listeners a los botones del header
document.querySelectorAll('#buttonsHeader button').forEach(button => {
    button.addEventListener('click', () => {
        const sectionId = button.getAttribute('data-section'); // Obtén el ID de la sección desde el atributo personalizado
        showSection(sectionId); // Llama a la función para hacer scroll
    });
});


document.addEventListener('DOMContentLoaded', function() {
    // Elementos de la galería
    const mainImage = document.getElementById('mainGalleryImage');
    const thumbnails = document.querySelectorAll('.thumbnail');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const imageLoader = document.querySelector('.image-loader');
    
    let currentIndex = 0;

    // Función mejorada para cambiar imagen
    function changeImage(index) {
        const newSrc = thumbnails[index].getAttribute('data-full');
        
        // Solo cambiar si es una imagen diferente
        if (mainImage.src !== newSrc) {
            // Mostrar efecto de carga
            imageLoader.style.display = 'block';
            mainImage.style.opacity = '0';
            
            // Pre-cargar la imagen
            const img = new Image();
            img.src = newSrc;
            img.onload = function() {
                // Cambiar la imagen principal
                mainImage.src = newSrc;
                mainImage.style.opacity = '1';
                imageLoader.style.display = 'none';
                
                // Actualizar thumbnail activo
                thumbnails.forEach(thumb => thumb.classList.remove('active'));
                thumbnails[index].classList.add('active');
                currentIndex = index;
            };
        }
    }

    // Event listeners para thumbnails
    thumbnails.forEach((thumbnail, index) => {
        thumbnail.addEventListener('click', () => changeImage(index));
    });

    // Botones de navegación
    prevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + thumbnails.length) % thumbnails.length;
        changeImage(currentIndex);
    });

    nextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % thumbnails.length;
        changeImage(currentIndex);
    });

    // Auto-scroll de thumbnails para mantener visible el activo
    function scrollToActiveThumbnail() {
        const activeThumb = document.querySelector('.thumbnail.active');
        if (activeThumb) {
            activeThumb.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }

    // Inicializar con la primera imagen
    changeImage(0);
});

function irGestion() {
    window.location.href = "login.html";
}

document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.navbar ul');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Toggle del menú hamburguesa
    hamburger.addEventListener('click', function() {
        this.classList.toggle('active');
        navMenu.classList.toggle('show');
        
        // Bloquear scroll cuando el menú está abierto
        if (navMenu.classList.contains('show')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    });
    
    // Cerrar menú al hacer clic en un enlace
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Solo manejar si es un enlace a sección (#)
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                
                // Cerrar el menú
                hamburger.classList.remove('active');
                navMenu.classList.remove('show');
                document.body.style.overflow = '';
                
                // Obtener la sección objetivo
                const targetId = this.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                
                // Desplazamiento suave
                if (targetSection) {
                    window.scrollTo({
                        top: targetSection.offsetTop - 80,
                        behavior: 'smooth'
                    });
                    
                    // Actualizar clase activa
                    navLinks.forEach(lnk => lnk.classList.remove('active'));
                    this.classList.add('active');
                }
            }
            // Los enlaces normales (como login.html) se manejarán normalmente
        });
    });
    
    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.navbar') && !e.target.closest('.hamburger')) {
            hamburger.classList.remove('active');
            navMenu.classList.remove('show');
            document.body.style.overflow = '';
        }
    });
    
    // Actualizar enlace activo al desplazarse
    window.addEventListener('scroll', function() {
        const scrollPosition = window.scrollY + 100;
        
        // Verificar cada sección
        document.querySelectorAll('section[id]').forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    });
});


document.addEventListener('DOMContentLoaded', function() {
    // Seleccionar todos los botones de toggle
    const toggleButtons = document.querySelectorAll('.mapa-toggle-btn');
    const closeButtons = document.querySelectorAll('.close-card-btn');
    
    // Añadir eventos a los botones de toggle
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const targetCard = document.getElementById(targetId);
            
            // Ocultar todas las tarjetas primero
            document.querySelectorAll('.mobile-card').forEach(card => {
                card.style.display = 'none';
            });
            
            // Quitar la clase 'active' de todos los botones
            toggleButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Mostrar la tarjeta seleccionada y marcar el botón
            targetCard.style.display = 'block';
            this.classList.add('active');
        });
    });
    
    // Añadir eventos a los botones de cierre
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const card = this.closest('.mobile-card');
            card.style.display = 'none';
            
            // Quitar la clase 'active' del botón correspondiente
            toggleButtons.forEach(btn => {
                if (btn.getAttribute('data-target') === card.id) {
                    btn.classList.remove('active');
                }
            });
        });
    });
    
    // También necesitas ajustar el CSS para dispositivos móviles
    function setupResponsiveLayout() {
        const isMobile = window.innerWidth < 768;
        const infoCards = document.querySelectorAll('.info-card');
        const mobileButtons = document.querySelector('.mapa-mobile-buttons');
        
        if (isMobile) {
            // Configuración para móvil
            mobileButtons.style.display = 'flex';
            infoCards.forEach(card => {
                card.classList.add('mobile-card');
                card.style.display = 'none';
            });
        } else {
            // Configuración para desktop
            mobileButtons.style.display = 'none';
            infoCards.forEach(card => {
                card.classList.remove('mobile-card');
                card.style.display = 'block';
            });
        }
    }
    
    // Ejecutar al cargar y cuando cambie el tamaño de la ventana
    setupResponsiveLayout();
    window.addEventListener('resize', setupResponsiveLayout);
});