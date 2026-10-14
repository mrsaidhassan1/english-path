import { Component, type ReactNode } from 'react';

/** Friendly fallback if a page fails, so learners never see a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-lg rounded-3xl border-2 border-dashed border-navy-100 bg-white p-8 text-center">
        <div className="text-5xl">🛠️</div>
        <h1 className="mt-3 text-2xl font-bold text-navy">Oops! Something went wrong.</h1>
        <p className="mt-1 text-navy-500">Your progress is saved. Please go back to the home page.</p>
        <p dir="rtl" lang="ar" className="mt-1 text-navy-400">حدث خطأ. تقدّمك محفوظ.</p>
        <div className="mt-5 flex justify-center gap-3">
          <a href="#/" onClick={() => this.setState({ error: null })} className="inline-flex min-h-[48px] items-center rounded-2xl bg-navy px-5 font-bold text-white">Home</a>
          <button onClick={() => location.reload()} className="min-h-[48px] rounded-2xl border-2 border-navy-100 px-5 font-bold text-navy">Reload</button>
        </div>
      </div>
    );
  }
}
