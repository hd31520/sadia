import React from "react";

export class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(_error, _errorInfo) {
    // You can log error info here if needed
    // console.error(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'red', fontWeight: 'bold', fontSize: 22, padding: 32, textAlign: 'center', background: '#fff0f0' }}>
          <div>Application Error</div>
          <div style={{ marginTop: 16 }}>{this.state.error?.message || String(this.state.error)}</div>
          <div style={{ marginTop: 24, fontSize: 16 }}>Please ensure the server is running and try again.</div>
        </div>
      );
    }
    return this.props.children;
  }
}
