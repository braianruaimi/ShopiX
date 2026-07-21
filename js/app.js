let deferredPrompt;
let waitingWorker;
let refreshing = false;
let testimonialIndex = 0;
let testimonialIntervalId = null;

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const iaAnswers = {
  pago: 'Aceptamos pagos por transferencia, tarjeta y efectivo contra entrega.',
  envio: 'El envío demora entre 24 y 72 horas hábiles según tu ubicación.',
  garantia: 'Todos los productos tienen garantía mínima de 6 meses.',
  seguimiento: 'Recibirás un enlace de seguimiento por WhatsApp tras tu compra.'
};

function showUpdateNotification(worker) {
  waitingWorker = worker;
  document.getElementById('update-notification')?.classList.remove('hidden');
}

function setCategoryLinkState(activeId) {
  document.querySelectorAll('[data-category-link]').forEach((link) => {
    link.classList.toggle('is-active', link.dataset.categoryLink === activeId);
  });
}

function getIaAnswer(question) {
  if (question.includes('pago')) return iaAnswers.pago;
  if (question.includes('envío')) return iaAnswers.envio;
  if (question.includes('garantía')) return iaAnswers.garantia;
  if (question.includes('seguimiento')) return iaAnswers.seguimiento;
  return '¡Gracias por tu consulta!';
}

function showTestimonial(index, cards, dots) {
  cards.forEach((card, cardIndex) => {
    card.classList.toggle('is-active', cardIndex === index);
  });
  dots.forEach((dot, dotIndex) => {
    dot.classList.toggle('is-active', dotIndex === index);
  });
}

function startTestimonialsAutoplay(cards, dots) {
  if (testimonialIntervalId || cards.length <= 1 || prefersReducedMotion) {
    return;
  }
  testimonialIntervalId = window.setInterval(() => {
    testimonialIndex = (testimonialIndex + 1) % cards.length;
    showTestimonial(testimonialIndex, cards, dots);
  }, 2000);
}

function stopTestimonialsAutoplay() {
  if (!testimonialIntervalId) {
    return;
  }
  window.clearInterval(testimonialIntervalId);
  testimonialIntervalId = null;
}

function updateProductCarousel(track, dots, index) {
  track.style.transform = `translateX(-${index * 100}%)`;
  dots.forEach((dot, dotIndex) => {
    dot.classList.toggle('is-active', dotIndex === index);
  });
}

function startProductCarouselAutoplay(carousel, goToSlide, slideCount) {
  const autoplayDelay = Number(carousel.getAttribute('data-carousel-autoplay'));

  if (prefersReducedMotion || slideCount <= 1 || !Number.isFinite(autoplayDelay) || autoplayDelay <= 0) {
    return;
  }

  let autoplayId = window.setInterval(() => {
    goToSlide();
  }, autoplayDelay);

  const restartAutoplay = () => {
    window.clearInterval(autoplayId);
    autoplayId = window.setInterval(() => {
      goToSlide();
    }, autoplayDelay);
  };

  carousel.addEventListener('mouseenter', () => {
    window.clearInterval(autoplayId);
  });

  carousel.addEventListener('mouseleave', restartAutoplay);
  carousel.addEventListener('focusin', () => {
    window.clearInterval(autoplayId);
  });
  carousel.addEventListener('focusout', restartAutoplay);
}

document.addEventListener('DOMContentLoaded', () => {
  const installBtn = document.getElementById('install-btn');
  const updateBtn = document.getElementById('update-btn');
  const iaModal = document.getElementById('ia-modal');
  const iaAnswer = document.getElementById('ia-answer');
  const iaOpenBtn = document.getElementById('ia-open-btn');
  const iaCloseBtn = document.getElementById('ia-close-btn');
  const revealTargets = document.querySelectorAll('[data-reveal]');
  const testimonialCards = Array.from(document.querySelectorAll('#testimonials-carousel .testimonial-card'));
  const testimonialDots = Array.from(document.querySelectorAll('#testimonials-dots .carousel-dot'));
  const sectionHeadings = Array.from(document.querySelectorAll('main section[aria-labelledby] h2[id]'));
  const productInfoOpenButtons = document.querySelectorAll('[data-product-info-open]');
  const productInfoCloseButtons = document.querySelectorAll('[data-product-info-close]');
  const productInfoModals = document.querySelectorAll('.product-specs-modal');
  const imageZoomTriggers = document.querySelectorAll('[data-image-zoom]');
  const imageZoomModal = document.getElementById('image-zoom-modal');
  const imageZoomTarget = document.getElementById('image-zoom-target');
  const imageZoomCloseButton = document.getElementById('image-zoom-close');

  document.documentElement.classList.add('reveal-ready');

  const closeImageZoomModal = () => {
    imageZoomModal?.classList.add('hidden');
    imageZoomModal?.classList.remove('flex');
    if (imageZoomTarget) {
      imageZoomTarget.removeAttribute('src');
      imageZoomTarget.alt = '';
    }
  };

  imageZoomTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      if (!imageZoomModal || !imageZoomTarget) {
        return;
      }

      imageZoomTarget.src = trigger.getAttribute('data-image-zoom') || '';
      imageZoomTarget.alt = trigger.getAttribute('data-image-zoom-alt') || '';
      imageZoomModal.classList.remove('hidden');
      imageZoomModal.classList.add('flex');
    });
  });

  imageZoomCloseButton?.addEventListener('click', closeImageZoomModal);

  imageZoomModal?.addEventListener('click', (event) => {
    if (event.target === imageZoomModal) {
      closeImageZoomModal();
    }
  });

  document.querySelectorAll('[data-product-carousel]').forEach((carousel) => {
    const track = carousel.querySelector('[data-carousel-track]');
    const prevButton = carousel.querySelector('[data-carousel-prev]');
    const nextButton = carousel.querySelector('[data-carousel-next]');
    const dots = Array.from(carousel.querySelectorAll('[data-carousel-dot]'));

    if (!track || dots.length === 0) {
      return;
    }

    let currentIndex = 0;
    const lastIndex = dots.length - 1;

    const goToSlide = (index = currentIndex + 1) => {
      currentIndex = index < 0 ? lastIndex : index > lastIndex ? 0 : index;
      updateProductCarousel(track, dots, currentIndex);
    };

    prevButton?.addEventListener('click', () => {
      const nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
      goToSlide(nextIndex);
    });

    nextButton?.addEventListener('click', () => {
      const nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
      goToSlide(nextIndex);
    });

    dots.forEach((dot, dotIndex) => {
      dot.addEventListener('click', () => {
        goToSlide(dotIndex);
      });
    });

    updateProductCarousel(track, dots, currentIndex);
    startProductCarouselAutoplay(carousel, goToSlide, dots.length);
  });

  updateBtn?.addEventListener('click', () => {
    if (waitingWorker) {
      waitingWorker.postMessage('SKIP_WAITING');
    }
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (installBtn) {
      installBtn.style.display = 'block';
    }
  });

  installBtn?.addEventListener('click', async () => {
    if (!deferredPrompt) {
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      installBtn.style.display = 'none';
    }
  });

  iaOpenBtn?.addEventListener('click', () => {
    iaModal?.classList.remove('hidden');
    if (iaAnswer) {
      iaAnswer.textContent = '';
    }
  });

  iaCloseBtn?.addEventListener('click', () => {
    iaModal?.classList.add('hidden');
  });

  iaModal?.addEventListener('click', (event) => {
    if (event.target === iaModal) {
      iaModal.classList.add('hidden');
    }
  });

  productInfoOpenButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const modalId = button.getAttribute('data-product-info-open');
      const modal = modalId ? document.getElementById(modalId) : null;
      if (!modal) {
        return;
      }
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    });
  });

  const closeProductModal = (modal) => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  };

  productInfoCloseButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const modal = button.closest('.product-specs-modal');
      if (modal) {
        closeProductModal(modal);
      }
    });
  });

  productInfoModals.forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeProductModal(modal);
      }
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }

    if (imageZoomModal && !imageZoomModal.classList.contains('hidden')) {
      closeImageZoomModal();
    }

    productInfoModals.forEach((modal) => {
      if (!modal.classList.contains('hidden')) {
        closeProductModal(modal);
      }
    });
  });

  document.querySelectorAll('[data-ia-question]').forEach((button) => {
    button.addEventListener('click', () => {
      if (iaAnswer) {
        iaAnswer.textContent = getIaAnswer(button.getAttribute('data-ia-question') || '');
      }
    });
  });

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -8% 0px'
  });

  revealTargets.forEach((target) => {
    revealObserver.observe(target);
  });

  if (sectionHeadings.length > 0) {
    const categoryObserver = new IntersectionObserver((entries) => {
      const visibleEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];

      if (visibleEntry?.target.id) {
        setCategoryLinkState(visibleEntry.target.id);
      }
    }, {
      rootMargin: '-28% 0px -54% 0px',
      threshold: [0.2, 0.45, 0.7]
    });

    sectionHeadings.forEach((heading) => {
      categoryObserver.observe(heading);
    });
  }

  document.querySelectorAll('[data-category-link]').forEach((link) => {
    link.addEventListener('click', () => {
      setCategoryLinkState(link.dataset.categoryLink || '');
    });
  });

  if (testimonialCards.length > 1) {
    startTestimonialsAutoplay(testimonialCards, testimonialDots);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopTestimonialsAutoplay();
        return;
      }
      startTestimonialsAutoplay(testimonialCards, testimonialDots);
    });
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then((registration) => {
      if (registration.waiting) {
        showUpdateNotification(registration.waiting);
      }

      registration.onupdatefound = () => {
        const installing = registration.installing;
        if (!installing) {
          return;
        }

        installing.onstatechange = () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateNotification(installing);
          }
        };
      };

      window.setInterval(() => {
        registration.update();
      }, 60000);
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) {
        return;
      }
      refreshing = true;
      window.location.reload();
    });
  }
});