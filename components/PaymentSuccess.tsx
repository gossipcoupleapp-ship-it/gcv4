import React from 'react';
import { Sparkles } from 'lucide-react';

const PaymentSuccess: React.FC = () => {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center animate-fade-in font-sans">
            <div className="flex flex-col items-center space-y-8">
                {/* Animated Icon */}
                <div className="relative">
                    <div className="absolute inset-0 bg-primary-mid/20 blur-xl rounded-full animate-pulse"></div>
                    <Sparkles
                        size={48}
                        className="text-primary-mid animate-pulse relative z-10"
                        strokeWidth={1.5}
                    />
                </div>

                {/* Text Content */}
                <div className="text-center space-y-3">
                    <h2 className="text-xl font-medium text-gray-800 tracking-tight">
                        Finalizando sua assinatura...
                    </h2>
                    <p className="text-sm text-gray-400 font-light">
                        Preparando o ambiente do casal
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;
