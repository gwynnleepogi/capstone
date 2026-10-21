<template>
  <div class="scanner-overlay" @click.self="$emit('close')">
    <section
      class="scanner-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scanner-title"
    >
      <header class="scanner-header">
        <div>
          <h2 id="scanner-title">Scan Property QR Code</h2>
          <p>Point your camera at an item's QR code to view its details.</p>
        </div>
        <button class="scanner-close" type="button" aria-label="Close scanner" @click="$emit('close')">
          &times;
        </button>
      </header>

      <div class="scanner-video-frame">
        <video ref="video" class="scanner-video" aria-label="Camera preview"></video>
        <div class="scanner-target" aria-hidden="true"></div>
      </div>

      <p v-if="errorMessage" class="scanner-error" role="alert">{{ errorMessage }}</p>
      <p v-else class="scanner-hint" aria-live="polite">{{ statusMessage }}</p>

      <footer class="scanner-footer">
        <button class="scanner-cancel" type="button" @click="$emit('close')">Cancel</button>
      </footer>
    </section>
  </div>
</template>

<script>
import { BrowserQRCodeReader } from '@zxing/browser'

export default {
  name: 'ItemQrScanner',

  emits: ['close', 'scanned'],

  data() {
    return {
      controls: null,
      errorMessage: '',
      statusMessage: 'Starting camera...',
      hasScanned: false,
      isActive: true
    }
  },

  mounted() {
    this.startScanner()
  },

  beforeUnmount() {
    this.isActive = false
    this.stopScanner()
  },

  methods: {
    async startScanner() {
      if (!navigator.mediaDevices?.getUserMedia) {
        this.errorMessage = 'Camera scanning requires a supported browser and a secure connection (HTTPS or localhost).'
        return
      }

      try {
        const reader = new BrowserQRCodeReader()
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: 'environment' }
            }
          },
          this.$refs.video,
          (result, error, controls) => {
            if (result && this.isActive && !this.hasScanned) {
              this.controls = controls
              this.handleScannedValue(result.getText())
            } else if (error && this.isActive && !this.hasScanned) {
              this.statusMessage = 'Hold the QR code steady within the camera frame.'
            }
          }
        )

        if (!this.isActive || this.hasScanned) {
          controls.stop()
          return
        }

        this.controls = controls
        this.statusMessage = 'Camera ready. Point it at an item QR code.'
      } catch (error) {
        if (!this.isActive) {
          return
        }

        console.error('Unable to start item QR scanner:', error)
        this.errorMessage = error.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access in your browser settings and try again.'
          : error.name === 'NotFoundError'
            ? 'No camera was found on this device.'
            : error.message || 'Unable to start the camera scanner.'
      }
    },

    handleScannedValue(value) {
      let scannedUrl

      try {
        scannedUrl = new URL(value)
      } catch {
        this.errorMessage = 'This is not a valid item QR code for this system.'
        return
      }

      const systemItemId = scannedUrl.searchParams.get('item')
      const isSystemItemLink =
        scannedUrl.pathname === '/items' &&
        typeof systemItemId === 'string' &&
        systemItemId.length > 0

      if (
        ['http:', 'https:'].includes(scannedUrl.protocol) &&
        isSystemItemLink
      ) {
        this.hasScanned = true
        this.stopScanner()
        this.$emit('scanned', {
          id: systemItemId,
          destination: 'system'
        })
        return
      }

      const match = scannedUrl.pathname.match(/^\/public-item\/([^/]+)\/?$/)
      const token = scannedUrl.searchParams.get('token')

      if (
        !['http:', 'https:'].includes(scannedUrl.protocol) ||
        !match ||
        !/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/i.test(token || '')
      ) {
        this.errorMessage = 'This QR code does not link to item details in this system.'
        return
      }

      let itemId
      try {
        itemId = decodeURIComponent(match[1])
      } catch {
        this.errorMessage = 'This QR code contains an invalid item link.'
        return
      }

      this.hasScanned = true
      this.stopScanner()
      this.$emit('scanned', {
        id: itemId,
        token
      })
    },

    stopScanner() {
      if (this.controls) {
        this.controls.stop()
        this.controls = null
      }
    }
  }
}
</script>

<style scoped>
.scanner-overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(25, 42, 29, .65);
}

.scanner-dialog {
  width: min(100%, 560px);
  padding: 22px;
  border: 1px solid #e4e2d8;
  border-radius: 12px;
  background: #fff;
  color: #26332a;
  box-shadow: 0 16px 48px rgba(0, 0, 0, .24);
}

.scanner-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.scanner-header h2 {
  margin: 0 0 5px;
  color: #2f5d3a;
  font-size: 20px;
}

.scanner-header p {
  margin: 0;
  color: #717a72;
  font-size: 14px;
}

.scanner-close {
  align-self: flex-start;
  border: 0;
  background: transparent;
  color: #536052;
  font-size: 28px;
  line-height: 1;
}

.scanner-video-frame {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4 / 3;
  border-radius: 8px;
  background: #171b18;
}

.scanner-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scanner-target {
  position: absolute;
  inset: 18% 24%;
  border: 3px solid #e8c547;
  border-radius: 12px;
  box-shadow: 0 0 0 1000px rgba(0, 0, 0, .16);
  pointer-events: none;
}

.scanner-hint,
.scanner-error {
  min-height: 24px;
  margin: 12px 0 0;
  font-size: 14px;
}

.scanner-hint {
  color: #717a72;
}

.scanner-error {
  color: #a33f36;
}

.scanner-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.scanner-cancel {
  padding: 8px 14px;
  border: 1px solid #d7dbd4;
  border-radius: 6px;
  background: #fff;
  color: #344637;
}
</style>
