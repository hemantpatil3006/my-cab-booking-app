import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';

export default function SignUpPage() {
    return (
        <main className="h-[100dvh] overflow-y-auto overflow-x-hidden relative flex flex-col pt-4 md:pt-[10dvh] pb-12 px-4 sm:pt-12">
            <div className="w-full max-w-md mx-auto relative z-20 mb-6 md:mb-12">
                <Link href="/" className="inline-flex items-center gap-2 text-xs md:text-sm text-gray-400 hover:text-white transition-colors group">
                    <span className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-violet-500 transition-colors">←</span>
                    Back to Home
                </Link>
            </div>

            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-700/20 blur-3xl" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-700/20 blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md mx-auto flex flex-col justify-center pb-8">
                <div className="text-center mb-4 md:mb-8">
                    <div className="inline-flex items-center gap-2 mb-2 md:mb-4">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-bold shadow-lg text-xs md:text-base">
                            R
                        </div>
                        <span className="text-xl md:text-2xl font-bold gradient-text">RideLane</span>
                    </div>
                    <h1 className="text-xl md:text-2xl font-bold text-white">Create your account</h1>
                    <p className="text-gray-400 mt-1 text-xs md:text-sm">Join thousands of riders and drivers</p>
                </div>

                <div className="flex justify-center">
                    <SignUp
                        appearance={{
                            elements: {
                                rootBox: 'w-full',
                                card: 'bg-gray-900 border border-white/10 shadow-2xl rounded-2xl overflow-hidden',
                                headerTitle: 'text-white',
                                headerSubtitle: 'text-gray-400',
                                socialButtonsBlockButton: 'bg-white/5 border-white/10 text-white hover:bg-white/10 transition-colors',
                                socialButtonsBlockButtonText: 'text-white font-medium',
                                dividerLine: 'bg-white/10',
                                dividerText: 'text-gray-500',
                                formFieldLabel: 'text-gray-300 font-medium',
                                formFieldInput: 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all',
                                formButtonPrimary: 'bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold h-11 transition-all shadow-lg shadow-violet-500/20',
                                footerActionLink: 'text-violet-400 hover:text-violet-300 font-bold',
                                footerActionText: 'text-gray-400',
                                identityPreviewText: 'text-white',
                                identityPreviewEditButtonIcon: 'text-violet-400',
                                formResendCodeLink: 'text-violet-400 hover:text-violet-300',
                                otpCodeFieldInput: 'bg-white/5 border-white/10 text-white focus:border-violet-500',
                            },
                        }}
                    />
                </div>
            </div>
        </main>
    );
}
