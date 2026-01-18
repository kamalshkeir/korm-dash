// NAV
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    const savedColor = localStorage.getItem('theme-color');
    if (savedColor) {
        document.documentElement.style.setProperty('--theme-color', savedColor);
        document.documentElement.style.setProperty('--theme-color-hover',
            adjustBrightness(savedColor, -10));
    }
    // Configure navigation links
    const navLinks = [
        {
            href: admdmdPartth,
            label: 'Dashboard',
            icon: `<svg viewBox="0 0 24 24"><path d="M13 9V3h8v6h-8ZM3 13V3h8v10H3Zm10 8V11h8v10h-8ZM3 21v-6h8v6H3Z"/></svg>`,
            exact: true
        },
        {
            href: `${admdmdPartth}/tables`,
            label: 'Tables',
            icon: `<svg viewBox="0 0 24 24"><path d="M3 3h18v18H3V3Zm16 16V5H5v14h14ZM7 7h4v4H7V7Zm0 6h10v2H7v-2Zm0 4h10v2H7v-2Zm6-9h4v2h-4V8Z"/></svg>`,
            exact: false
        },
        {
            href: `${admdmdPartth}/logs`,
            label: 'Logs And Metrics',
            icon: `<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 12h2v5H7zm8-5h2v10h-2zm-4 7h2v3h-2zm0-4h2v2h-2z"/></svg>`,
            exact: true
        }
    ];

    if (kanbanEnabled == "true") {
        navLinks.push({
            href: `${admdmdPartth}/kanbans`,
            label: 'Kanban',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 5v11"/>
            <path d="M12 5v6"/>
            <path d="M18 5v14"/>
            </svg>`,
            exact: false
        });
    }
    if (terminalEnabled === "true") {
        navLinks.push({
            href: `${admdmdPartth}/terminal`,
            label: 'Terminal',
            icon: `<?xml version="1.0" encoding="utf-8"?>
<svg viewBox="0 0 24 24">
<path d="M7.29291 14.2929C6.90238 14.6834 6.90238 15.3166 7.29291 15.7071C7.68343 16.0976 8.31659 16.0976 8.70712 15.7071L11.2071 13.2071C11.8738 12.5404 11.8738 11.4596 11.2071 10.7929L8.70712 8.29289C8.3166 7.90237 7.68343 7.90237 7.29291 8.29289C6.90238 8.68342 6.90238 9.31658 7.29291 9.70711L9.5858 12L7.29291 14.2929ZM13 14C12.4477 14 12 14.4477 12 15C12 15.5523 12.4477 16 13 16H16C16.5523 16 17 15.5523 17 15C17 14.4477 16.5523 14 16 14H13ZM22 7.93418C22 7.95604 22 7.97799 22 8.00001L22 16.0658C22.0001 16.9523 22.0001 17.7161 21.9179 18.3278C21.8297 18.9833 21.631 19.6117 21.1213 20.1213C20.6117 20.631 19.9833 20.8297 19.3278 20.9179C18.7161 21.0001 17.9523 21.0001 17.0658 21L6.9342 21C6.0477 21.0001 5.28388 21.0001 4.67222 20.9179C4.0167 20.8297 3.38835 20.631 2.87869 20.1213C2.36902 19.6117 2.17028 18.9833 2.08215 18.3278C1.99991 17.7161 1.99995 16.9523 2 16.0658L2 7.9342C1.99995 7.0477 1.99991 6.28388 2.08215 5.67221C2.17028 5.0167 2.36902 4.38835 2.87869 3.87868C3.38835 3.36902 4.0167 3.17028 4.67222 3.08215C5.28388 2.99991 6.04769 2.99995 6.93418 3L17 3.00001C17.022 3.00001 17.044 3 17.0658 3C17.9523 2.99995 18.7161 2.99991 19.3278 3.08215C19.9833 3.17028 20.6117 3.36902 21.1213 3.87869C21.631 4.38835 21.8297 5.0167 21.9179 5.67221C22.0001 6.28387 22.0001 7.04769 22 7.93418Z"/>
</svg>`,
            exact: true
        });
    }
    if (traceEnabled === "true") {
        navLinks.push({
            href: `${admdmdPartth}/traces`,
            label: 'Traces',
            icon: `<svg viewBox="0 0 24 24">
<!-- Outer circle -->
<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
<!-- Compass needle -->
<path d="M12 2 L14 12 L12 22 L10 12 Z" fill="currentColor"/>
<!-- Center dot -->
<circle cx="12" cy="12" r="1.5" fill="currentColor"/>
<!-- Cardinal points -->
<path d="M12 4 L12 6 M20 12 L18 12 M12 20 L12 18 M4 12 L6 12" 
      stroke="currentColor" 
      stroke-width="2" 
      stroke-linecap="round"/>
</svg>`,
            exact: true
        })
    }

    if (nodeManagerEnabled === "true") {
        navLinks.push({
            href: `${admdmdPartth}/nodemanager`,
            label: 'Node Manager',
            icon: `<svg viewBox="0 0 24 24">
<!-- Central sphere with gradient -->
<defs>
    <linearGradient id="sphereGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:currentColor;stop-opacity:0.8"/>
        <stop offset="100%" style="stop-color:currentColor;stop-opacity:0.3"/>
    </linearGradient>
    <!-- Orbital path gradient -->
    <linearGradient id="orbitGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:currentColor;stop-opacity:0.2"/>
        <stop offset="50%" style="stop-color:currentColor;stop-opacity:0.1"/>
        <stop offset="100%" style="stop-color:currentColor;stop-opacity:0.2"/>
    </linearGradient>
</defs>

<!-- Orbital rings -->
<ellipse cx="12" cy="12" rx="11" ry="4.5" 
         fill="none" 
         stroke="url(#orbitGradient)" 
         stroke-width="0.75" 
         transform="rotate(-25,12,12)"/>
<ellipse cx="12" cy="12" rx="9.5" ry="9.5" 
         fill="none" 
         stroke="url(#orbitGradient)" 
         stroke-width="0.75"/>

<!-- Central sphere -->
<circle cx="12" cy="12" r="5" fill="url(#sphereGradient)"/>

<!-- Orbiting nodes -->
<circle cx="21" cy="12" r="2" fill="currentColor"/>
<circle cx="3" cy="12" r="2" fill="currentColor"/>
<circle cx="12" cy="3" r="2" fill="currentColor"/>
<circle cx="12" cy="21" r="2" fill="currentColor"/>

<!-- Connection lines -->
<path d="M17 12a5 5 0 0 1 4 0M7 12a5 5 0 0 0-4 0M12 7a5 5 0 0 1 0-4M12 17a5 5 0 0 0 0 4" 
      stroke="currentColor" 
      stroke-width="0.75" 
      fill="none" 
      opacity="0.5"/>
</svg>`,
            exact: true
        })
    }
    const mainNav = document.getElementById('mainNav');
    if (mainNav) {
        mainNav.links = navLinks;
    }
});


function adjustBrightness(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255))
        .toString(16)
        .slice(1);
}
