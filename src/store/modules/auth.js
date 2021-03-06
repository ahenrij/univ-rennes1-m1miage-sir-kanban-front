import { AuthService, AuthError } from '../../services/auth.service'
import { TokenService, StorageService } from '../../services/storage.service'
import router from '../../router'

const state = {
    authenticating: false,
    accessToken: TokenService.getToken(),
    authenticationErrorCode: 0,
    authenticationError: '',
    refreshTokenPromise: null  // Holds the promise of the refresh token
}

const getters = {
    loggedIn: (state) => {
        return state.accessToken ? true : false
    },

    authErrorCode: (state) => {
        return state.authenticationErrorCode
    },

    authError: (state) => {
        return state.authenticationError
    },

    authenticating: (state) => {
        return state.authenticating
    }
}

const actions = {

    async login({ commit }, { email, password }) {

        commit('loginRequest');
        try {
            const token = await AuthService.login(email, password);
            var user = StorageService.getUser()

            //update store with fresh logged in user infos
            commit('data/mutate', { property: 'user', with: user }, { root: true })
            commit('loginSuccess', token)

            // Redirect the user to the page he first tried to visit or to the home view
            if (router.history.current.query.redirect != '/logout') {
                router.push(router.history.current.query.redirect || '/');
            } else {
                router.push('/');
            }

            //window.location.reload()
            return true

        } catch (e) {
            //console.log(e)
            if (e instanceof AuthError) {
                commit('loginError', { errorCode: e.errorCode, errorMessage: e.message })
            } else {
                commit('loginError', { errorCode: 501, errorMessage: "Oops! Une erreur est survenue"})
            }
            return false
        }
    },

    logout({ commit }) {
        AuthService.logout()
        commit('logoutSuccess')
        router.push('/home')
    },

    refreshToken({ commit, state }) {
        // If this is the first time the refreshToken has been called, make a request
        // otherwise return the same promise to the caller
        if (!state.refreshTokenPromise) {
            const p = AuthService.refreshToken()
            commit('refreshTokenPromise', p)

            // Wait for the UserService.refreshToken() to resolve. On success set the token and clear promise
            // Clear the promise on error as well.
            p.then(
                response => {
                    commit('refreshTokenPromise', null)
                    commit('loginSuccess', response)
                },
                // eslint-disable-next-line no-unused-vars
                _error => {
                    commit('refreshTokenPromise', null)
                }
            )
        }

        return state.refreshTokenPromise
    },

    async register({commit}, user) {

        commit('loginRequest');
        var registered = false
        try {
            registered = await AuthService.register(user);

            //IMPORTANT: if returned value then registered is true.
            //update store
            commit('loginSuccess', null)
            // Redirect the user to login page
            router.push('/login');
            
        } catch (e) {
            if (e instanceof AuthError) {
                commit('loginError', { errorCode: e.errorCode, errorMessage: e.message })
            } else {
                commit('loginError', { errorCode: 400, errorMessage: "Oops! Une erreur est survenue"})
            }
            registered = false
        }
        return registered
    }
}

const mutations = {
    loginRequest(state) {
        state.authenticating = true;
        state.authenticationError = ''
        state.authenticationErrorCode = 0
    },

    loginSuccess(state, accessToken) {
        state.accessToken = accessToken
        state.authenticating = false;
    },

    loginError(state, { errorCode, errorMessage }) {
        state.authenticating = false
        state.authenticationErrorCode = errorCode
        state.authenticationError = errorMessage
    },

    logoutSuccess(state) {
        state.accessToken = null
    },

    refreshTokenPromise(state, promise) {
        state.refreshTokenPromise = promise
    }
}

export const auth = {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
}

export default auth