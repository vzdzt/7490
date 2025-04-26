// Polyfill for NodeList.forEach
if (window.NodeList && !NodeList.prototype.forEach) {
  NodeList.prototype.forEach = Array.prototype.forEach;
}

document.addEventListener('DOMContentLoaded', () => {
  const carousel = document.querySelector('.packets-carousel');
  const packetDetails = document.getElementById('packet-details');
  let radius = Math.min(window.innerWidth * 0.4, 300);
  let currentAngle = 0;
  let selectedPacket = null;
  let autoRotateInterval;
  let currentCarousel = 1;
  let data;
  let carouselData = {
    1: [],
    2: []
  };
  let isCarouselSwitching = false;

  // Smooth scroll fallback
  function scrollToElement(element) {
    if ('scrollBehavior' in document.documentElement.style) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else {
      element.scrollIntoView();
    }
  }

  function switchCarousel() {
    if (isCarouselSwitching) return;
    isCarouselSwitching = true;

    const newCarousel = currentCarousel === 1 ? 2 : 1;
    const toggleBtn = document.getElementById('toggle-btn');
    if (toggleBtn) {
      toggleBtn.textContent = newCarousel === 1 ? 'Show More' : 'Show Less';
    }

    function animHandler() {
      if (carousel.style.animation.includes('carouselSwoop')) {
        carousel.innerHTML = '';
        renderPackets(carouselData[newCarousel]);
        positionPackets();
        carousel.style.animation = 'carouselSwoopIn 1s ease-in-out';
        currentCarousel = newCarousel;
      } else if (carousel.style.animation.includes('carouselSwoopIn')) {
        isCarouselSwitching = false;
        carousel.style.animation = '';
        carousel.removeEventListener('animationend', animHandler);
      }
    }

    if (carousel) {
      carousel.addEventListener('animationend', animHandler);
      carousel.style.animation = 'carouselSwoop 1s ease-in-out';
    }
  }

  // Load data
  fetch('data.json')
    .then(response => response.json())
    .then(jsonData => {
      data = jsonData;
      // Split packets into two carousels
      data.packets.forEach(packet => {
        if (['Stans', 'Gimmick', 'Music'].includes(packet.genre)) {
          carouselData[2].push(packet);
        } else {
          carouselData[1].push(packet);
        }
      });

      renderPackets(carouselData[1]);
      positionPackets();
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        startAutoRotate();
      }

      // Add toggle button listener
      const toggleBtn = document.getElementById('toggle-btn');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => switchCarousel());
      }

      // Touch support for mobile
      if (carousel) {
        let touchStartX = 0;
        carousel.addEventListener('touchstart', (e) => {
          touchStartX = e.touches[0].clientX;
        });

        carousel.addEventListener('touchmove', (e) => {
          e.preventDefault();
          const touchX = e.touches[0].clientX;
          const deltaX = touchX - touchStartX;
          rotateCarousel(deltaX > 0 ? 0.05 : -0.05);
          touchStartX = touchX;
        });

        // Mouse wheel scrolling
        carousel.addEventListener('wheel', (e) => {
          e.preventDefault();
          rotateCarousel(e.deltaY > 0 ? -0.1 : 0.1);
        });
      }
    })
    .catch(error => {
      console.error('Error loading data:', error);
      if (carousel) {
        carousel.innerHTML = '<p>Failed to load data. Please try again later.</p>';
      }
    });

  function renderPackets(packets) {
    if (!carousel || !packets) return;

    carousel.innerHTML = '';
    const isMobile = window.innerWidth <= 600;
    const visibleCount = isMobile ? 5 : packets.length;
    const rotationSet = Math.floor(currentAngle / (2 * Math.PI));

    packets.forEach((packet, index) => {
      if (isMobile && rotationSet % 2 === 1) {
        index = (index + Math.floor(packets.length / 2)) % packets.length;
      }

      const packetCard = document.createElement('div');
      packetCard.classList.add('packet-card');
      packetCard.setAttribute('tabindex', '0');
      packetCard.innerHTML = `
        <h2>${packets[index].genre}</h2>
        <img src="${packets[index].image}" alt="${packets[index].genre} packet">
        <p>${packets[index].description}</p>
      `;
      packetCard.addEventListener('click', () => selectPacket(packets[index], packetCard));
      packetCard.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          selectPacket(packets[index], packetCard);
        }
      });
      if (!isMobile || (isMobile && index < visibleCount)) {
        carousel.appendChild(packetCard);
      }
    });
  }

  function positionPackets() {
    const packetCards = document.querySelectorAll('.packet-card');
    const totalPackets = packetCards.length;
    const angleStep = (2 * Math.PI) / totalPackets;

    packetCards.forEach((card, index) => {
      const angle = index * angleStep + currentAngle;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      card.style.transform = `translate3d(${x}px, 0, ${z}px) rotateY(${angle * (180/Math.PI)}deg)`;
      card.classList.add('visible');

      const normalizedZ = (z + radius) / (2 * radius);
      card.style.opacity = normalizedZ * 0.5 + 0.5;
    });
  }

  function rotateCarousel(direction) {
    currentAngle += direction * (Math.PI / 8);
    if (window.innerWidth <= 600) {
      const fullRotation = 2 * Math.PI;
      if (Math.abs(currentAngle) >= fullRotation) {
        renderPackets(carouselData[currentCarousel]);
      }
    }
    requestAnimationFrame(() => positionPackets());
  }

  function startAutoRotate() {
    let lastTime = null;
    function rotate(timestamp) {
      if (!lastTime) lastTime = timestamp;
      if (timestamp - lastTime >= 150) {
        rotateCarousel(-0.15);
        lastTime = timestamp;
      }
      autoRotateInterval = requestAnimationFrame(rotate);
    }
    autoRotateInterval = requestAnimationFrame(rotate);
  }

  function stopAutoRotate() {
    cancelAnimationFrame(autoRotateInterval);
  }

  function selectPacket(packet, packetCard) {
    if (!packet || !packetCard || !packetDetails) return;

    stopAutoRotate();

    // Deselect previous packet
    const prevCard = document.querySelector('.packet-card.selected');
    if (prevCard) prevCard.classList.remove('selected');

    // Select new packet
    packetCard.classList.add('selected');
    selectedPacket = packet;

    // Render packet details
    packetDetails.classList.add('active');
    packetDetails.innerHTML = `
      <button class="close-btn" onclick="document.getElementById('packet-details').classList.remove('active')">×</button>
      <h2>${packet.genre} Collection</h2>
      <div class="accounts-grid"></div>
    `;

    const accountsGrid = packetDetails.querySelector('.accounts-grid');
    packet.accounts.forEach((account, index) => {
      const accountCard = document.createElement('article');
      accountCard.classList.add('account-card');
      accountCard.style.setProperty('--card-index', index);
      accountCard.innerHTML = `
        <img src="${account.pfp}" alt="${account.handle} PFP" class="pfp">
        <h3><a href="https://twitter.com/${account.handle}" target="_blank">@${account.handle}</a></h3>
        <p class="rarity ${account.rarity.toLowerCase()}">${account.rarity}</p>
        <p class="total-score">Score: <span>${account.score}/10</span></p>
        <details name="score-details">
          <summary>Score Breakdown</summary>
          <ul>
            ${Object.entries(account.scores)
              .map(([key, value]) => `<li>${key}: ${value}</li>`)
              .join('')}
          </ul>
        </details>
      `;
      accountsGrid.appendChild(accountCard);
    });

    // Handle details toggle
    packetDetails.querySelectorAll('details[name="score-details"]').forEach(details => {
      details.addEventListener('toggle', () => {
        if (details.open) {
          packetDetails.querySelectorAll('details[name="score-details"]').forEach(d => {
            if (d !== details) d.open = false;
          });
        }
      });
    });

    // Scroll to details
    scrollToElement(packetDetails);
  }

  // Update radius on resize
  window.addEventListener('resize', () => {
    const newRadius = window.innerWidth <= 600 ? Math.min(window.innerWidth * 0.15, 100) : Math.min(window.innerWidth * 0.35, 300);
    if (radius !== newRadius) {
      radius = newRadius;
      positionPackets();
    }
  });

  // Stop rotation on hover
  if (carousel) {
    carousel.addEventListener('mouseenter', stopAutoRotate);
    // Resume rotation on mouse leave
    carousel.addEventListener('mouseleave', () => {
      if (!selectedPacket && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        startAutoRotate();
      }
    });
  }
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    const cards = document.querySelectorAll('.packet-card');
    if (e.key === 'ArrowRight') {
      rotateCarousel(-1);
      cards.forEach(card => {
        card.style.animation = 'flutter 0.5s ease-in-out';
        setTimeout(() => card.style.animation = '', 500);
      });
    } else if (e.key === 'ArrowLeft') {
      rotateCarousel(1);
      cards.forEach(card => {
        card.style.animation = 'flutter 0.5s ease-in-out';
        setTimeout(() => card.style.animation = '', 500);
      });
    }
  });

  // Carousel controls
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => rotateCarousel(1));
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => rotateCarousel(-1));
  }
});
