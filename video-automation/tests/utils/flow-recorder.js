/**
 * FlowRecorder - Utility for recording user flows with step annotations
 */
class FlowRecorder {
  constructor(page, flowName) {
    this.page = page;
    this.flowName = flowName;
    this.steps = [];
    this.currentStep = 0;
  }

  async start() {
    console.log(`🎬 Starting recording: ${this.flowName}`);

    // Inject step indicator overlay
    await this.page.addInitScript(() => {
      window.createStepIndicator = (stepText) => {
        const existing = document.getElementById('flow-step-indicator');
        if (existing) existing.remove();

        const indicator = document.createElement('div');
        indicator.id = 'flow-step-indicator';
        indicator.style.cssText = `
          position: fixed;
          bottom: 20px;
          left: 20px;
          background: rgba(0, 102, 204, 0.95);
          color: white;
          padding: 15px 25px;
          border-radius: 8px;
          font-family: Arial, sans-serif;
          font-size: 18px;
          font-weight: bold;
          z-index: 999999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          animation: slideIn 0.3s ease-out;
        `;
        indicator.textContent = stepText;

        const style = document.createElement('style');
        style.textContent = `
          @keyframes slideIn {
            from { transform: translateX(-100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `;
        document.head.appendChild(style);
        document.body.appendChild(indicator);
      };
    });
  }

  async step(description, action) {
    this.currentStep++;
    const stepNumber = this.currentStep;
    console.log(`  Step ${stepNumber}: ${description}`);
    this.steps.push({ number: stepNumber, description });

    // Show step indicator
    await this.page.evaluate((desc) => {
      if (window.createStepIndicator) {
        window.createStepIndicator(desc);
      }
    }, description);

    // Execute the action
    await action();

    // Keep indicator visible for a moment
    await this.pause(800);
  }

  async pause(ms = 1000) {
    await this.page.waitForTimeout(ms);
  }

  async finish() {
    console.log(`✅ Recording finished: ${this.flowName} (${this.currentStep} steps)`);

    // Remove indicator
    await this.page.evaluate(() => {
      const indicator = document.getElementById('flow-step-indicator');
      if (indicator) indicator.remove();
    });

    await this.pause(1000);
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

