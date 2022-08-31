docker rm -f $(docker ps -a -q)
docker rmi -f $(docker images -a -q)
docker volume rm -f $(docker volume ls -q)