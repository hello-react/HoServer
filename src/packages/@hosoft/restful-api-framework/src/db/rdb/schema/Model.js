/**
 * HoServer API Server Ver 2.0
 * create: 2021/02/01
 **/
module.exports = (sequelize, DataTypes) => {
    return sequelize.define(
        'Model',
        {
            enabled: {
                type: DataTypes.BOOLEAN,
                defaultValue: '0'
            },
            name: {
                type: DataTypes.STRING(50),
                allowNull: false,
                primaryKey: true
            },
            dis_name: {
                type: DataTypes.STRING(50),
                allowNull: false
            },
            type: {
                type: DataTypes.INTEGER(4),
                allowNull: true
            },
            category_name: {
                type: DataTypes.STRING(50),
                allowNull: true
            },
            timestamp: {
                type: DataTypes.BOOLEAN,
                defaultValue: '1'
            },
            db_table: {
                type: DataTypes.STRING(50),
                allowNull: false
            },
            route_name: {
                type: DataTypes.STRING(50),
                allowNull: true
            },
            properties: {
                type: DataTypes.JSON,
                allowNull: false
            },
            description: {
                type: DataTypes.STRING(128),
                allowNull: true
            },
            order: {
                type: DataTypes.INTEGER(11)
            }
        },
        {
            tableName: 'api_models',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            freezeTableName: true
        }
    )
}
