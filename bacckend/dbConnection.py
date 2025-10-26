import pymysql
from pymysql.connections import Connection
from pymysql.cursors import Cursor

def get_connection():
    connection = pymysql.connect(
        host='localhost',
        user='root',
        password='Eternal@12',
        database='dvc',
        cursorclass=pymysql.cursors.DictCursor
    )
    return connection