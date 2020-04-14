# 请先修改服务器地址端口、以及用户名密码
tar -xzvf ./hoserver_dump.tar.gz
mongorestore -h localhost:27017 -u "admin" -p "123456" ./hoserver_dump
