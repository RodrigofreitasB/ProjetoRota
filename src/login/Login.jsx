
import React, { useState, useEffect } from 'react';
import './Login.css';
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import { useNavigate } from 'react-router-dom';
import { VscVerifiedFilled } from "react-icons/vsc";
import Rota from '../Rota/Rota';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [showSplash, setShowSplash] = useState(true);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirmPassword, setRegConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [regError, setRegError] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowSplash(false);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoginError('');
        setRegError('');
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
                navigate('/rota')
            } else {
                if (regPassword !== regConfirmPassword) {
                    setRegError('As senhas não são iguais.');
                    return;
                }
                await createUserWithEmailAndPassword(auth, regEmail, regPassword);
                document.querySelector('.sucess-text').classList.remove('d-none');



            }
        } catch (err) {
            console.error(err);
            const code = err?.code || '';
            if (isLogin) {
                switch (code) {
                    case 'auth/invalid-email':
                        setLoginError('Email inválido.');
                        break;
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                        setLoginError('Email ou senha estão errados.');
                        break;
                    case 'auth/invalid-credential':
                        setLoginError('Credenciais inválidas.');
                        break;
                    default:
                        setLoginError(err.message || 'Erro ao fazer login.');
                }
            } else {
                switch (code) {
                    case 'auth/email-already-in-use':
                        setRegError('O Email já existe.');
                        break;
                    case 'auth/weak-password':
                        setRegError('Senha fraca: deve ter ao menos 6 caracteres.');
                        break;
                    case 'auth/invalid-email':
                        setRegError('Email inválido.');
                        break;
                    default:
                        setRegError(err.message || 'Erro ao cadastrar usuário.');
                }
            }
        }
    };


    return (
        <>
            <div className={`splash-screen ${!showSplash ? 'slide-down' : ''}`}>
                <h1 className="typing-text">Seja bem vindo</h1>
            </div>

            <div className="login-wrapper">
                <div className={`login-card-split ${!showSplash ? 'animate-slide-down' : ''}`}>
                    {/* Left Side - Branding */}
                    <div className="branding-section">
                        <div className="branding-content">

                        </div>
                    </div>

                    {/* Right Side - Form */}
                    <div className="form-section">
                        <div className="form-header">

                            <h2>{isLogin ? 'Bem-vindo de volta!' : 'Crie uma conta.'}</h2>
                            <p>{isLogin ? 'Continue sua aventura.' : 'Cadastre-se para começar.'}</p>
                        </div>

                        <form className="auth-form" onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    className="input-field"
                                    value={isLogin ? loginEmail : regEmail}
                                    onChange={(e) => {
                                        if (isLogin) { setLoginEmail(e.target.value); setLoginError(''); }
                                        else { setRegEmail(e.target.value); setRegError(''); }
                                    }}
                                />
                            </div>

                            <div className="input-group">
                                <label>Senha</label>
                                <div className="password-wrapper">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="input-field"
                                        value={isLogin ? loginPassword : regPassword}
                                        onChange={(e) => {
                                            if (isLogin) { setLoginPassword(e.target.value); setLoginError(''); }
                                            else { setRegPassword(e.target.value); setRegError(''); }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowPassword((s) => !s)}
                                    >
                                        {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                                    </button>
                                </div>
                            </div>

                            {!isLogin && (
                                <div className="input-group">
                                    <label>Confirmar Senha</label>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="input-field"
                                        value={regConfirmPassword}
                                        onChange={(e) => { setRegConfirmPassword(e.target.value); setRegError(''); }}
                                    />
                                </div>
                            )}


                            <div className="sucess-text d-none">
                                <VscVerifiedFilled size={24} />
                                <p>Cadastro realizado com sucesso!</p>
                            </div>

                            {/* Errors */}
                            {isLogin && loginError && <div className="error-text">{loginError}</div>}
                            {!isLogin && regError && <div className="error-text">{regError}</div>}

                            <button className="submit-btn" type="submit">
                                {isLogin ? 'Entrar' : 'Cadastrar'}
                            </button>

                            <div className="switch-mode">
                                <p>
                                    {isLogin ? "Não possui conta? " : "Já possui conta? "}
                                    <button
                                        type="button"
                                        className="link-btn"
                                        onClick={() => {
                                            setIsLogin(!isLogin);
                                            setLoginError('');
                                            setRegError('');
                                        }}
                                    >
                                        {isLogin ? 'Cadastrar' : 'Entrar'}
                                    </button>
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Login;
