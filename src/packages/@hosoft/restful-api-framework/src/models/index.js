/**
 * HoServer API Server Ver 2.0
 * Copyright http://hos.helloreact.cn
 *
 * create: 2020/07/15
 **/

// must require this file after global.DB_MODELS set!!!

let models = null

const getAllModels = () => {
    if (!models) {
        models = []
        for (const model of global.DB_MODELS) {
            models[model.name] = model
        }
    }

    return models
}

module.exports = getAllModels()
