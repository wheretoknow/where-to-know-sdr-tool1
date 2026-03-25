import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(e) {
    return { error: e };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: "var(--red)", fontSize: 13 }}>
          <strong>Error loading this section:</strong> {this.state.error.message}
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--text3)" }}>Check browser console for details.</div>
        </div>
      );
    }
    return this.props.children;
  }
}
