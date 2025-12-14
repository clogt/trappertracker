/**
 * Social Share Manager for TrapperTracker
 * Handles sharing trapper alert zones to social media platforms
 */

class SocialShareManager {
    constructor(map, config = {}) {
        this.map = map;
        this.config = {
            baseUrl: config.baseUrl || 'https://trappertracker.com',
            ...config
        };
        this.leafletImageLoaded = false;
    }

    /**
     * Load leaflet-image library dynamically
     */
    async loadLeafletImage() {
        if (this.leafletImageLoaded) return;

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/leaflet-image@0.4.0/leaflet-image.js';
            script.onload = () => {
                this.leafletImageLoaded = true;
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Capture the current map view as an image
     */
    async captureMapImage(zone, width = 1200, height = 630) {
        await this.loadLeafletImage();

        // Center map on zone with appropriate zoom
        this.map.setView([zone.latitude, zone.longitude], 15);

        // Wait for tiles to load
        await new Promise(resolve => setTimeout(resolve, 800));

        return new Promise((resolve, reject) => {
            if (typeof leafletImage === 'undefined') {
                reject(new Error('leaflet-image library not loaded'));
                return;
            }

            leafletImage(this.map, (err, canvas) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Resize to target dimensions
                const resizedCanvas = this.resizeCanvas(canvas, width, height);
                resolve(resizedCanvas);
            });
        });
    }

    /**
     * Resize canvas to target dimensions
     */
    resizeCanvas(sourceCanvas, targetWidth, targetHeight) {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        // Draw with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Draw resized image
        ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

        return canvas;
    }

    /**
     * Main share method
     */
    async share(zone, platform) {
        const shareUrl = `${this.config.baseUrl}/?zone=${zone.blip_id}`;
        const shareData = {
            title: `Trapper Alert: ${zone.description}`,
            text: `Active trapper zone reported. Keep pets safe and leashed in this area!`,
            url: shareUrl
        };

        try {
            // Try Web Share API first (mobile)
            if (platform === 'native' && navigator.share) {
                try {
                    // Capture map image
                    const canvas = await this.captureMapImage(zone);
                    const blob = await new Promise(resolve =>
                        canvas.toBlob(resolve, 'image/png')
                    );

                    const file = new File([blob], 'trapper-alert.png', {
                        type: 'image/png'
                    });

                    await navigator.share({
                        ...shareData,
                        files: [file]
                    });

                    return { success: true, method: 'native' };
                } catch (err) {
                    console.warn('Native share failed, falling back:', err);
                    // Fallback to platform-specific
                }
            }

            // Platform-specific sharing
            switch(platform) {
                case 'facebook':
                    return this.shareToFacebook(shareUrl);
                case 'twitter':
                    return this.shareToTwitter(shareData);
                case 'nextdoor':
                    return this.shareToNextdoor(shareData);
                case 'download':
                    return this.downloadImage(zone);
                default:
                    // Try native share as fallback
                    if (navigator.share) {
                        await navigator.share(shareData);
                        return { success: true, method: 'native-fallback' };
                    }
                    throw new Error(`Unknown platform: ${platform}`);
            }
        } catch (error) {
            console.error('Share failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Share to Facebook
     */
    shareToFacebook(url) {
        const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        window.open(shareUrl, 'facebook-share', 'width=600,height=400');
        return { success: true, method: 'facebook' };
    }

    /**
     * Share to Twitter/X
     */
    shareToTwitter(shareData) {
        const text = encodeURIComponent(`${shareData.title}\n${shareData.text}`);
        const url = encodeURIComponent(shareData.url);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
        window.open(twitterUrl, 'twitter-share', 'width=600,height=400');
        return { success: true, method: 'twitter' };
    }

    /**
     * Share to Nextdoor (copy to clipboard)
     */
    async shareToNextdoor(shareData) {
        const text = `🚨 ${shareData.title}\n\n${shareData.text}\n\nView map: ${shareData.url}`;

        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Share text copied! Paste into Nextdoor.', 'success');

            // Open Nextdoor in new tab
            setTimeout(() => {
                window.open('https://nextdoor.com', '_blank');
            }, 1000);

            return { success: true, method: 'clipboard' };
        } catch (err) {
            this.showToast('Failed to copy to clipboard', 'error');
            return { success: false, error: err.message };
        }
    }

    /**
     * Download map image
     */
    async downloadImage(zone) {
        try {
            const canvas = await this.captureMapImage(zone, 1200, 1200);
            const link = document.createElement('a');
            link.download = `trapper-alert-${zone.blip_id}-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            this.showToast('Image downloaded successfully', 'success');
            return { success: true, method: 'download' };
        } catch (err) {
            this.showToast('Failed to download image', 'error');
            return { success: false, error: err.message };
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `share-toast share-toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Add CSS animations
if (!document.getElementById('share-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'share-toast-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Export for use in other scripts
window.SocialShareManager = SocialShareManager;
