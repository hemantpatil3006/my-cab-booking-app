import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect('/onboarding');

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4">
      {/* Gradient blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-700/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-700/20 blur-3xl pointer-events-none" />

      {/* Nav */}
      <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-bold text-sm shadow-lg">
            R
          </div>
          <span className="text-lg font-bold gradient-text">RideLane</span>
        </div>
        <div className="flex gap-3">
          <Link href="/sign-in" className="btn-secondary text-sm py-2 px-4">Sign In</Link>
          <Link href="/sign-up" className="btn-primary text-sm py-2 px-4">Get Started</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-8 text-sm text-violet-300">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Rides available near you
        </div>

        <h1 className="text-5xl sm:text-7xl font-extrabold leading-tight mb-6">
          Your ride,{' '}
          <span className="gradient-text">on demand.</span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
          RideLane connects riders with trusted drivers in seconds. Sign up as a{' '}
          <span className="text-violet-400 font-semibold">Rider</span> to book your trip, or as a{' '}
          <span className="text-cyan-400 font-semibold">Driver</span> to start earning.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/sign-up" className="btn-primary text-base px-8 py-4 w-full sm:w-auto">
            🚗 Book a Ride
          </Link>
          <Link href="/sign-up" className="btn-secondary text-base px-8 py-4 w-full sm:w-auto">
            🚕 Become a Driver
          </Link>
        </div>

        {/* Stats strip */}
        <div className="mt-20 grid grid-cols-3 gap-6 max-w-2xl mx-auto">
          {[
            { label: 'Active Riders', value: '12K+' },
            { label: 'Verified Drivers', value: '3.4K+' },
            { label: 'Rides Completed', value: '98K+' },
          ].map((stat) => (
            <div key={stat.label} className="card text-center">
              <p className="text-2xl sm:text-3xl font-extrabold gradient-text">{stat.value}</p>
              <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
