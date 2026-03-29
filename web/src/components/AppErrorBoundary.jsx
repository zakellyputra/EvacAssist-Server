import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('EvacAssist admin app crashed', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-error-boundary">
          <div className="app-error-card">
            <p className="kicker">Application Recovery</p>
            <h1>Operations console encountered an unexpected UI error.</h1>
            <p>
              The admin workspace did not shut down, but this screen prevented a full white-page
              crash. Reload the console to restore the latest mock operations state.
            </p>
            <button type="button" className="button button-primary" onClick={this.handleReload}>
              Reload Console
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
