/**
 * FlowRecorder - Utility for recording user flows with step annotations
 */
class FlowRecorder {
  constructor(page, flowName) {
    this.page = page;
    this.flowName = flowName;
    this.steps = [];
    this.currentStep = 0;
    this.lastClickPosition = null;
  }

  async start() {
    console.log(`🎬 Starting recording: ${this.flowName}`);

    // Inject step indicator overlay with click tracking
    await this.page.addInitScript(() => {
      // Track last click position
      window.lastClickPosition = null;
      document.addEventListener('click', (e) => {
        window.lastClickPosition = { x: e.clientX, y: e.clientY };
      }, true);

      window.createStepIndicator = (stepText, useClickPosition = true) => {
        const existing = document.getElementById('flow-step-indicator');
        if (existing) existing.remove();

        const indicator = document.createElement('div');
        indicator.id = 'flow-step-indicator';

        // Determine position
        let position = 'top-right'; // default
        let customPosition = '';

        if (useClickPosition && window.lastClickPosition) {
          const { x, y } = window.lastClickPosition;
          // Position near click, but offset so it doesn't cover the element
          customPosition = `
            position: fixed;
            left: ${Math.min(x + 20, window.innerWidth - 350)}px;
            top: ${Math.min(y - 40, window.innerHeight - 100)}px;
          `;
          position = 'click';
        } else {
          // Default to top-right
          customPosition = `
            position: fixed;
            top: 20px;
            right: 20px;
          `;
        }

        indicator.style.cssText = `
          ${customPosition}
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px 24px;
          border-radius: 12px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          font-size: 16px;
          font-weight: 600;
          z-index: 999999;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2);
          animation: ${position === 'click' ? 'popIn' : 'slideInFromTop'} 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255, 255, 255, 0.2);
          max-width: 320px;
          word-wrap: break-word;
          pointer-events: none;
        `;

        // Add icon and text
        indicator.innerHTML = `
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="
              width: 32px;
              height: 32px;
              background: rgba(255, 255, 255, 0.25);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 18px;
              flex-shrink: 0;
              animation: pulse 2s ease-in-out infinite;
            ">
              ✓
            </div>
            <div style="flex: 1;">${stepText}</div>
          </div>
        `;

        // Add styles if not already added
        if (!document.getElementById('flow-recorder-styles')) {
          const style = document.createElement('style');
          style.id = 'flow-recorder-styles';
          style.textContent = `
            @keyframes slideInFromTop {
              from { 
                transform: translateY(-100px) scale(0.8);
                opacity: 0;
              }
              to { 
                transform: translateY(0) scale(1);
                opacity: 1;
              }
            }
            
            @keyframes popIn {
              0% { 
                transform: scale(0) rotate(-180deg);
                opacity: 0;
              }
              50% {
                transform: scale(1.1) rotate(10deg);
              }
              100% { 
                transform: scale(1) rotate(0deg);
                opacity: 1;
              }
            }
            
            @keyframes pulse {
              0%, 100% { 
                transform: scale(1);
                opacity: 1;
              }
              50% { 
                transform: scale(1.1);
                opacity: 0.8;
              }
            }
            
            @keyframes fadeOut {
              from {
                opacity: 1;
                transform: scale(1);
              }
              to {
                opacity: 0;
                transform: scale(0.9);
              }
            }
            
            #flow-step-indicator.removing {
              animation: fadeOut 0.3s ease-out forwards;
            }
          `;
          document.head.appendChild(style);
        }

        document.body.appendChild(indicator);

        // Add click position indicator (visual dot)
        if (position === 'click' && window.lastClickPosition) {
          const dot = document.createElement('div');
          dot.className = 'click-indicator-dot';
          dot.style.cssText = `
            position: fixed;
            left: ${window.lastClickPosition.x - 6}px;
            top: ${window.lastClickPosition.y - 6}px;
            width: 12px;
            height: 12px;
            background: #667eea;
            border: 2px solid white;
            border-radius: 50%;
            z-index: 999998;
            pointer-events: none;
            animation: clickRipple 0.6s ease-out;
            box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7);
          `;

          if (!document.getElementById('click-ripple-styles')) {
            const rippleStyle = document.createElement('style');
            rippleStyle.id = 'click-ripple-styles';
            rippleStyle.textContent = `
              @keyframes clickRipple {
                0% {
                  box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7);
                  transform: scale(1);
                }
                50% {
                  box-shadow: 0 0 0 20px rgba(102, 126, 234, 0);
                  transform: scale(1.2);
                }
                100% {
                  box-shadow: 0 0 0 20px rgba(102, 126, 234, 0);
                  transform: scale(1);
                  opacity: 0;
                }
              }
            `;
            document.head.appendChild(rippleStyle);
          }

          document.body.appendChild(dot);
          setTimeout(() => dot.remove(), 600);
        }

        // Reset click position after use
        window.lastClickPosition = null;
      };

      window.removeStepIndicator = () => {
        const indicator = document.getElementById('flow-step-indicator');
        if (indicator) {
          indicator.classList.add('removing');
          setTimeout(() => indicator.remove(), 300);
        }
      };
    });
  }

  async step(description, action, options = {}) {
    this.currentStep++;
    const stepNumber = this.currentStep;
    const fullDescription = `${stepNumber}. ${description}`;
    console.log(`  Step ${stepNumber}: ${description}`);
    this.steps.push({ number: stepNumber, description });

    // Show step indicator BEFORE action (to capture click position)
    await this.page.evaluate((desc) => {
      if (window.createStepIndicator) {
        // Small delay to ensure click is registered
        setTimeout(() => window.createStepIndicator(desc, true), 50);
      }
    }, fullDescription);

    await this.pause(500); // Brief pause to show the indicator

    // Execute the action
    await action();

    // Keep indicator visible for a moment
    await this.pause(options.pauseDuration || 1500);

    // Smoothly remove indicator
    await this.page.evaluate(() => {
      if (window.removeStepIndicator) {
        window.removeStepIndicator();
      }
    });

    await this.pause(200); // Brief pause for removal animation
  }

  async pause(ms = 1000) {
    await this.page.waitForTimeout(ms);
  }

  async finish() {
    console.log(`✅ Recording finished: ${this.flowName} (${this.currentStep} steps)`);

    // Remove indicator with animation
    await this.page.evaluate(() => {
      if (window.removeStepIndicator) {
        window.removeStepIndicator();
      }
    });

    await this.pause(500);
  }

  getMetadata() {
    return {
      flowName: this.flowName,
      steps: this.steps,
      totalSteps: this.currentStep,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { FlowRecorder };
