// Polyfill for NodeList.forEach
if (window.NodeList && !NodeList.prototype.forEach) {
  NodeList.prototype.forEach = Array.prototype.forEach;
}

document.addEventListener('DOMContentLoaded', () => {
  const carousel = document.querySelector('.packets-carousel');
  const packetDetails = document.getElementById('packet-details');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  let radius = Math.min(window.innerWidth * 0.5, 350); // Smaller radius for better scaling
  let currentAngle = 0;
  let selectedPacket = null;
  let autoRotateInterval;

  // Smooth scroll fallback
  function scrollToElement(element) {
    if ('scrollBehavior' in document.documentElement.style) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else {
      element.scrollIntoView();
    }
  }

  // Load data
  fetch('data.json')
    .then(response => response.json())
    .then(data => {
      renderPackets(data.packets);
      positionPackets();
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        startAutoRotate();
      }
    })
    .catch(error => {
      console.error('Error loading data:', error);
      carousel.innerHTML = '<p>Failed to load data. Please try again later.</p>';
    });

  // Update radius on resize
  window.addEventListener('resize', () => {
    const newRadius = Math.min(window.innerWidth * 0.5, 350);
    if (radius !== newRadius) {
      radius = newRadius;
      positionPackets();
    }
  });

  // Mouse wheel scrolling
  carousel.addEventListener('wheel', (e) => {
    e.preventDefault();
    rotateCarousel(e.deltaY > 0 ? -0.1 : 0.1);
  });

  // Touch support for mobile
  let touchStartX = 0;
  let touchEndX = 0;
  let currentIndex = 0;
  
  function initMobileCarousel() {
    const cards = document.querySelectorAll('.packet-card');
    updateCarouselPosition(cards);
  }

  function updateCarouselPosition(cards, animate = false) {
    cards.forEach((card, index) => {
      card.style.transition = animate ? 'transform 0.3s ease' : 'none';
      const offset = (index - currentIndex) * 100;
      card.style.transform = `translateX(${offset}%)`;
      card.style.opacity = Math.abs(offset) > 100 ? '0' : '1';
    });
  }

  carousel.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    carousel.querySelectorAll('.packet-card').forEach(card => {
      card.style.transition = 'none';
    });
  });

  carousel.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const currentX = e.changedTouches[0].screenX;
    const diff = currentX - touchStartX;
    const cards = carousel.querySelectorAll('.packet-card');
    const percentageMoved = (diff / window.innerWidth) * 100;
    
    cards.forEach((card, index) => {
      const baseOffset = (index - currentIndex) * 100;
      card.style.transform = `translateX(${baseOffset + percentageMoved}%)`;
    });
  });

  carousel.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const deltaX = touchEndX - touchStartX;
    const cards = carousel.querySelectorAll('.packet-card');
    
    if (Math.abs(deltaX) > 50) {
      currentIndex += deltaX > 0 ? -1 : 1;
      currentIndex = Math.max(0, Math.min(currentIndex, cards.length - 1));
    }
    
    updateCarouselPosition(cards, true);
  });

  // Initialize mobile layout if needed
  if (window.innerWidth <= 768) {
    initMobileCarousel();
  }

  // Carousel controls
  prevBtn.addEventListener('click', () => rotateCarousel(1));
  nextBtn.addEventListener('click', () => rotateCarousel(-1));

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') rotateCarousel(-1);
    else if (e.key === 'ArrowLeft') rotateCarousel(1);
  });

  function renderPackets(packets) {
    carousel.innerHTML = '';
    packets.forEach(packet => {
      const packetCard = document.createElement('div');
      packetCard.classList.add('packet-card');
      packetCard.setAttribute('tabindex', '0');
      packetCard.innerHTML = `
        <h2>${packet.genre}</h2>
        <img src="${packet.image}" alt="${packet.genre} packet">
        <p>${packet.description}</p>
      `;
      packetCard.addEventListener('click', () => selectPacket(packet, packetCard));
      packetCard.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          selectPacket(packet, packetCard);
        }
      });
      carousel.appendChild(packetCard);
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

      // Adjust opacity based on z position
      const normalizedZ = (z + radius) / (2 * radius);
      card.style.opacity = normalizedZ * 0.5 + 0.5;
    });
  }

  function rotateCarousel(direction) {
    currentAngle += direction * (Math.PI / 8);
    positionPackets();
  }

  function startAutoRotate() {
    let lastTime = null;
    function rotate(timestamp) {
      if (!lastTime) lastTime = timestamp;
      if (timestamp - lastTime >= 100) {
        rotateCarousel(-0.25);
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
    stopAutoRotate();

    // Deselect previous packet
    if (selectedPacket) {
      const prevCard = document.querySelector('.packet-card.selected');
      if (prevCard) prevCard.classList.remove('selected');
    }

    // Select new packet
    packetCard.classList.add('selected');
    selectedPacket = packet;

    // Render packet details
    packetDetails.classList.add('active');
    packetDetails.innerHTML = `
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

  // Stop rotation on hover
  carousel.addEventListener('mouseenter', stopAutoRotate);

  // Resume rotation on mouse leave
  carousel.addEventListener('mouseleave', () => {
    if (!selectedPacket && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      startAutoRotate();
    }
  });
});
