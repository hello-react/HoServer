import _ from 'lodash'
import React from 'react'

/**
 * plugin to add payment page support for HoServer admin site
 */
class PaymentPage {
    constructor() {
        _.bindAll(this, ['init'])
    }

    init(pluginManager) {
    }
}

export default new PaymentPage()
