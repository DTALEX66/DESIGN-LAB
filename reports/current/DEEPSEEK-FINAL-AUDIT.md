# DeepSeek Final Audit - DL-TP-20260914-DEEPSEEK-AUTHORITY-R1

Subject: `0e53d30f10ef1b5790d45f477d741f512a6663a1` on branch `codex/deepseek-authority-r1`. Written 2026-09-13T17:08:21+00:00.

#
#
 
R
e
p
o
s
i
t
o
r
y
 
N
o
r
m
a
l
i
z
a
t
i
o
n
 
R
e
p
o
r
t




R
e
p
o
s
i
t
o
r
y
 
d
i
r
e
c
t
o
r
y
 
s
c
h
e
m
e
 
a
u
d
i
t
e
d
:
 
C
O
N
F
O
R
M
 
1
4
,
 
D
E
V
I
A
T
I
O
N
 
1
 
(
d
e
s
i
g
n
-
l
a
b
 
d
u
a
l
 
s
c
h
e
m
e
)
,
 
E
M
P
T
Y
_
D
I
R
 
1
 
(
s
e
r
v
i
c
e
s
)
,
 
E
X
T
R
A
 
3
 
(
g
i
t
-
i
g
n
o
r
e
d
 
l
o
c
a
l
 
d
i
r
e
c
t
o
r
i
e
s
)
.


L
e
g
a
c
y
 
p
a
t
h
 
s
c
a
n
:
 
a
c
t
i
v
e
 
l
e
g
a
c
y
 
u
s
a
g
e
 
0
;
 
t
h
e
 
r
e
m
a
i
n
i
n
g
 
h
i
t
s
 
a
r
e
 
h
i
s
t
o
r
i
c
a
l
 
r
e
c
o
r
d
s
 
a
n
d
 
g
u
a
r
d
 
m
a
r
k
e
r
s
 
t
h
a
t
 
k
e
e
p
 
t
h
e
 
r
e
f
u
s
a
l
 
v
o
c
a
b
u
l
a
r
y
.


S
i
n
g
l
e
 
w
r
i
t
e
r
 
f
o
r
 
t
a
s
k
 
s
t
a
t
u
s
 
i
s
 
d
e
s
i
g
n
-
l
a
b
/
c
o
n
f
i
g
/
t
a
s
k
-
l
e
d
g
e
r
-
r
3
.
j
s
o
n
;
 
t
h
e
 
m
a
c
h
i
n
e
 
a
u
t
h
o
r
i
t
y
 
l
e
d
g
e
r
 
h
a
s
 
o
n
e
 
w
r
i
t
e
r
 
s
c
r
i
p
t
 
a
n
d
 
`
v
e
r
i
f
y
`
 
p
a
s
s
e
s
 
f
o
r
 
a
l
l
 
5
8
 
t
a
s
k
s
.


c
u
r
r
e
n
t
/
 
a
n
d
 
h
i
s
t
o
r
y
/
 
a
r
e
 
s
e
p
a
r
a
t
e
d
:
 
s
u
p
e
r
s
e
d
e
d
 
p
a
c
k
s
 
l
i
v
e
 
u
n
d
e
r
 
d
o
c
s
/
h
i
s
t
o
r
y
/
 
a
n
d
 
a
r
e
 
c
l
a
s
s
i
f
i
e
d
 
a
s
 
H
I
S
T
O
R
Y
 
o
r
 
A
C
T
I
V
E
_
P
R
O
D
U
C
T
_
P
A
C
K
,
 
n
e
v
e
r
 
a
s
 
a
 
d
i
s
p
a
t
c
h
 
e
n
t
r
y
.


P
r
o
j
e
c
t
 
s
t
a
t
u
s
 
p
r
o
j
e
c
t
i
o
n
s
 
b
i
n
d
 
s
u
b
j
e
c
t
 
t
y
p
e
,
 
w
o
r
k
t
r
e
e
 
d
i
g
e
s
t
 
a
n
d
 
t
a
s
k
p
a
c
k
 
i
d
e
n
t
i
t
y
,
 
a
n
d
 
r
e
f
u
s
e
 
t
o
 
p
r
e
s
e
n
t
 
a
 
d
i
r
t
y
 
t
r
e
e
 
a
s
 
a
 
c
o
m
m
i
t
.


#
#
 
L
a
n
g
u
a
g
e
 
G
o
v
e
r
n
a
n
c
e
 
R
e
p
o
r
t




L
a
n
g
u
a
g
e
 
i
n
v
e
n
t
o
r
y
:
 
1
8
9
1
 
t
r
a
c
k
e
d
 
f
i
l
e
s
,
 
1
5
 
l
a
n
g
u
a
g
e
s
,
 
u
n
m
a
p
p
e
d
 
e
x
t
e
n
s
i
o
n
 
f
i
l
e
s
:
 
1
3
1
.


L
a
n
g
u
a
g
e
 
b
o
u
n
d
a
r
y
 
g
a
t
e
 
v
e
r
d
i
c
t
:
 
P
A
S
S
;
 
f
o
r
b
i
d
d
e
n
 
l
a
n
g
u
a
g
e
 
f
i
l
e
s
:
 
0
.


P
y
t
h
o
n
 
o
w
n
s
 
t
h
e
 
r
u
n
t
i
m
e
;
 
t
h
e
 
f
i
x
t
u
r
e
 
o
w
n
s
 
t
h
e
 
o
n
l
y
 
N
o
d
e
 
m
a
n
i
f
e
s
t
;
 
J
a
v
a
 
i
s
 
s
c
o
p
e
d
 
t
o
 
a
n
 
i
n
e
r
t
 
f
i
x
t
u
r
e
 
b
l
o
b
;
 
R
u
s
t
 
i
s
 
c
o
n
d
i
t
i
o
n
a
l
 
a
n
d
 
a
b
s
e
n
t
.


J
S
O
N
 
S
c
h
e
m
a
 
r
e
m
a
i
n
s
 
t
h
e
 
c
r
o
s
s
-
l
a
n
g
u
a
g
e
 
c
o
n
t
r
a
c
t
 
t
r
u
t
h
:
 
c
a
n
o
n
i
c
a
l
 
v
o
c
a
b
u
l
a
r
i
e
s
 
a
r
e
 
r
e
a
d
 
f
r
o
m
 
t
h
e
 
o
w
n
i
n
g
 
s
c
h
e
m
a
s
 
a
n
d
 
e
v
e
r
y
 
d
e
t
e
c
t
e
d
 
h
a
n
d
-
w
r
i
t
t
e
n
 
c
o
p
y
 
m
u
s
t
 
a
g
r
e
e
 
w
i
t
h
 
t
h
e
m
.


T
h
e
 
c
o
p
y
 
c
o
u
n
t
 
i
s
 
a
 
l
o
w
e
r
 
b
o
u
n
d
 
m
e
a
s
u
r
e
d
 
b
y
 
a
 
l
i
n
e
-
l
e
v
e
l
 
d
e
t
e
c
t
o
r
;
 
i
t
 
i
s
 
n
o
t
 
a
 
c
o
m
p
l
e
t
e
n
e
s
s
 
a
u
d
i
t
 
a
n
d
 
a
 
f
a
l
l
 
i
n
 
t
h
e
 
n
u
m
b
e
r
 
i
s
 
n
o
t
 
e
v
i
d
e
n
c
e
 
t
h
a
t
 
a
 
c
o
p
y
 
w
a
s
 
l
o
s
t
.


#
#
 
R
e
p
o
s
i
t
o
r
y
 
S
l
i
m
m
i
n
g
 
R
e
p
o
r
t




R
e
c
l
a
i
m
e
d
 
b
y
 
c
l
e
a
n
u
p
:
 
3
1
6
.
7
9
 
M
i
B
 
a
c
r
o
s
s
 
1
6
7
 
c
a
c
h
e
/
t
e
m
p
 
e
n
t
r
i
e
s
,
 
e
a
c
h
 
w
i
t
h
 
a
 
d
i
g
e
s
t
 
a
n
d
 
a
 
r
e
c
r
e
a
t
i
o
n
 
n
o
t
e
.


N
o
 
l
i
k
e
-
f
o
r
-
l
i
k
e
 
b
e
f
o
r
e
/
a
f
t
e
r
 
e
x
i
s
t
s
 
f
o
r
 
t
h
e
 
r
u
n
t
i
m
e
 
r
o
o
t
s
,
 
a
n
d
 
n
o
n
e
 
i
s
 
c
l
a
i
m
e
d
:
 
t
h
e
 
e
a
r
l
i
e
s
t
 
r
e
c
o
r
d
e
d
 
r
e
a
d
i
n
g
 
p
o
s
t
-
d
a
t
e
s
 
t
h
e
 
d
e
l
e
t
i
o
n
 
i
t
 
w
o
u
l
d
 
s
e
r
v
e
 
a
s
 
a
 
'
b
e
f
o
r
e
'
 
f
o
r
.
 
S
e
e
 
P
O
S
T
-
C
L
E
A
N
U
P
-
A
U
D
I
T
.
j
s
o
n
#
b
e
f
o
r
e
_
a
f
t
e
r
.


G
i
t
 
p
a
c
k
:
 
c
u
r
r
e
n
t
 
s
i
z
e
 
r
e
c
o
r
d
e
d
;
 
t
h
e
 
e
a
r
l
i
e
r
 
p
a
c
k
 
s
t
a
t
e
 
i
s
 
n
o
t
 
r
e
c
o
v
e
r
a
b
l
e
,
 
s
o
 
n
o
 
p
a
c
k
 
r
e
d
u
c
t
i
o
n
 
i
s
 
c
l
a
i
m
e
d
.


T
h
i
r
d
-
p
a
r
t
y
 
f
u
l
l
 
s
o
u
r
c
e
 
t
r
e
e
s
 
a
r
e
 
n
o
t
 
t
r
a
c
k
e
d
 
(
N
O
_
F
U
L
L
_
T
H
I
R
D
_
P
A
R
T
Y
_
S
O
U
R
C
E
_
T
R
E
E
S
_
T
R
A
C
K
E
D
)
:
 
3
 
p
r
e
s
e
n
t
 
i
n
 
t
h
e
 
t
r
e
e
,
 
3
7
 
o
n
l
y
 
i
n
 
a
n
 
i
g
n
o
r
e
d
 
c
a
c
h
e
,
 
6
 
v
i
a
 
l
o
c
k
 
r
e
f
e
r
e
n
c
e
.


E
v
i
d
e
n
c
e
-
b
e
a
r
i
n
g
 
r
u
n
t
i
m
e
 
d
i
r
e
c
t
o
r
i
e
s
 
w
e
r
e
 
N
O
T
 
d
e
l
e
t
e
d
;
 
t
h
e
y
 
a
r
e
 
l
i
s
t
e
d
 
f
o
r
 
o
w
n
e
r
 
a
p
p
r
o
v
a
l
,
 
w
h
i
c
h
 
i
s
 
t
h
e
 
o
n
l
y
 
p
a
t
h
 
t
h
e
 
t
a
s
k
p
a
c
k
 
a
l
l
o
w
s
 
f
o
r
 
t
h
e
m
.


#
#
 
D
a
t
a
 
S
p
i
l
l
 
M
i
g
r
a
t
i
o
n
 
R
e
p
o
r
t




C
e
n
s
u
s
 
v
e
r
d
i
c
t
:
 
C
E
N
S
U
S
_
C
O
M
P
L
E
T
E
;
 
s
c
o
p
e
 
i
s
 
m
e
t
a
d
a
t
a
 
a
n
d
 
p
a
t
h
 
l
e
v
e
l
 
o
n
l
y
.


D
E
S
I
G
N
-
L
A
B
-
o
w
n
e
d
 
l
e
g
a
c
y
 
o
b
j
e
c
t
s
 
m
i
g
r
a
t
e
d
:
 
1
0
 
(
1
1
5
6
5
1
3
8
 
b
y
t
e
s
)
,
 
w
i
t
h
 
p
e
r
-
o
b
j
e
c
t
 
d
i
g
e
s
t
s
 
a
n
d
 
r
e
s
t
o
r
e
 
p
a
t
h
s
.


E
m
p
t
y
 
l
e
g
a
c
y
 
d
i
r
e
c
t
o
r
i
e
s
 
c
l
e
a
r
e
d
 
b
y
 
t
h
e
 
m
i
g
r
a
t
i
o
n
:
 
3
 
(
t
h
e
 
n
a
m
e
s
p
a
c
e
 
h
e
l
d
 
e
m
p
t
y
 
d
i
r
e
c
t
o
r
i
e
s
 
o
n
l
y
,
 
s
o
 
n
o
t
h
i
n
g
 
w
i
t
h
 
c
o
n
t
e
n
t
 
w
a
s
 
d
e
l
e
t
e
d
)
.


R
e
f
u
s
e
d
 
a
s
 
a
g
e
n
t
-
n
a
t
i
v
e
:
 
.
h
e
r
m
e
s
/
s
k
i
l
l
-
c
a
l
l
-
i
n
d
e
x
.
j
s
o
n
 
(
D
O
_
N
O
T
_
T
O
U
C
H
)
.


N
o
 
p
r
i
v
a
t
e
 
s
e
s
s
i
o
n
,
 
c
r
e
d
e
n
t
i
a
l
,
 
s
i
b
l
i
n
g
 
p
r
o
j
e
c
t
 
o
r
 
E
:
 
d
r
i
v
e
 
c
o
n
t
e
n
t
 
w
a
s
 
r
e
a
d
 
a
t
 
a
n
y
 
p
o
i
n
t
 
i
n
 
t
h
i
s
 
r
u
n
.


#
#
 
C
o
n
t
r
a
c
t
 
G
r
a
p
h
 
R
e
p
o
r
t




C
o
n
t
r
a
c
t
 
g
r
a
p
h
:
 
1
1
 
c
o
n
c
e
p
t
s
,
 
0
 
u
n
r
e
s
o
l
v
e
d
 
l
i
n
k
s
,
 
v
e
r
d
i
c
t
 
N
O
_
B
R
O
K
E
N
_
L
I
N
K
.


C
o
n
s
u
m
e
r
 
e
d
g
e
s
 
a
r
e
 
v
e
r
i
f
i
e
d
,
 
n
o
t
 
a
s
s
e
r
t
e
d
:
 
a
 
d
e
c
l
a
r
e
d
 
c
o
n
s
u
m
e
r
 
m
u
s
t
 
r
e
f
e
r
e
n
c
e
 
t
h
e
 
c
o
n
c
e
p
t
'
s
 
p
r
o
d
u
c
e
r
 
m
o
d
u
l
e
,
 
t
a
b
l
e
 
o
r
 
s
c
h
e
m
a
 
i
n
 
e
x
e
c
u
t
a
b
l
e
 
c
o
d
e
.
 
C
o
m
m
e
n
t
s
 
a
n
d
 
d
o
c
s
t
r
i
n
g
s
 
d
o
 
n
o
t
 
c
o
u
n
t
.


A
n
 
i
n
d
e
p
e
n
d
e
n
t
 
a
u
d
i
t
 
f
o
u
n
d
 
o
n
e
 
f
i
c
t
i
o
n
a
l
 
e
d
g
e
 
(
Q
A
 
n
a
m
e
d
 
a
 
f
i
l
e
 
t
h
a
t
 
n
e
v
e
r
 
r
e
f
e
r
e
n
c
e
d
 
i
t
s
 
p
r
o
d
u
c
e
r
)
;
 
w
i
d
e
n
i
n
g
 
t
h
e
 
s
a
m
e
 
c
h
e
c
k
 
f
o
u
n
d
 
f
i
v
e
 
m
o
r
e
,
 
a
n
d
 
a
l
l
 
s
i
x
 
d
e
c
l
a
r
a
t
i
o
n
s
 
w
e
r
e
 
r
e
p
l
a
c
e
d
 
w
i
t
h
 
v
e
r
i
f
i
e
d
 
r
e
a
d
e
r
s
.
 
T
h
e
 
s
t
r
u
c
t
u
r
a
l
 
f
i
n
d
i
n
g
 
b
e
h
i
n
d
 
t
h
e
m
 
i
s
 
r
e
c
o
r
d
e
d
 
i
n
 
t
h
e
 
g
r
a
p
h
:
 
n
o
 
p
r
o
d
u
c
t
i
o
n
 
P
y
t
h
o
n
 
m
o
d
u
l
e
 
i
m
p
o
r
t
s
 
a
n
o
t
h
e
r
 
c
r
e
a
t
i
v
e
 
c
o
n
c
e
p
t
 
m
o
d
u
l
e
,
 
b
e
c
a
u
s
e
 
t
h
o
s
e
 
c
o
n
c
e
p
t
s
 
a
r
e
 
p
e
e
r
s
 
j
o
i
n
e
d
 
t
h
r
o
u
g
h
 
t
h
e
 
s
t
a
t
e
 
d
a
t
a
b
a
s
e
.


c
r
e
a
t
i
v
e
-
v
1
 
m
i
g
r
a
t
i
o
n
 
w
a
s
 
r
e
h
e
a
r
s
e
d
 
t
o
 
c
o
m
p
l
e
t
i
o
n
 
o
n
 
a
 
c
o
p
y
 
(
1
5
/
1
5
 
s
t
e
p
s
,
 
z
e
r
o
 
w
r
i
t
e
s
 
t
o
 
a
n
y
 
p
r
e
-
e
x
i
s
t
i
n
g
 
d
a
t
a
b
a
s
e
)
 
a
n
d
 
i
s
 
s
t
i
l
l
 
m
a
r
k
e
d
 
M
I
G
R
A
T
I
O
N
_
C
A
N
D
I
D
A
T
E
_
P
E
N
D
I
N
G
_
A
U
D
I
T
,
 
n
o
t
 
a
c
c
e
p
t
e
d
 
a
s
 
p
r
o
d
u
c
t
i
o
n
.


S
t
a
n
d
a
r
d
s
 
a
l
i
g
n
m
e
n
t
:
 
D
T
C
G
 
2
0
2
5
.
1
0
 
c
a
n
o
n
i
c
a
l
 
w
i
t
h
 
l
e
g
a
c
y
 
b
e
h
i
n
d
 
a
n
 
a
d
a
p
t
e
r
,
 
O
T
I
O
 
o
f
f
i
c
i
a
l
 
t
r
a
n
s
i
t
i
o
n
 
o
f
f
s
e
t
s
,
 
C
2
P
A
 
2
.
4
 
c
l
a
i
m
 
s
t
r
u
c
t
u
r
e
 
(
u
n
s
i
g
n
e
d
 
a
n
d
 
n
e
v
e
r
 
s
i
g
n
e
d
 
h
e
r
e
)
,
 
P
e
n
p
o
t
 
v
3
 
a
r
c
h
i
v
e
 
v
a
l
i
d
a
t
i
o
n
,
 
G
L
B
 
a
c
c
e
s
s
o
r
 
m
a
t
r
i
x
 
c
o
v
e
r
a
g
e
,
 
Q
A
 
a
u
t
o
m
a
t
i
o
n
/
m
o
d
e
l
/
h
u
m
a
n
 
b
o
u
n
d
a
r
y
.


#
#
 
M
e
a
s
u
r
e
d
 
r
e
p
o
s
i
t
o
r
y
 
s
t
a
t
e




|
 
I
t
e
m
 
|
 
V
a
l
u
e
 
|


|
-
-
-
|
-
-
-
|


|
 
t
r
a
c
k
e
d
 
f
i
l
e
s
 
b
e
f
o
r
e
 
|
 
1
8
3
2
 
|


|
 
t
r
a
c
k
e
d
 
f
i
l
e
s
 
a
f
t
e
r
 
|
 
1
8
9
1
 
|


|
 
t
r
a
c
k
e
d
 
M
i
B
 
b
e
f
o
r
e
 
|
 
3
0
.
1
5
 
|


|
 
t
r
a
c
k
e
d
 
M
i
B
 
a
f
t
e
r
 
|
 
3
0
.
9
7
 
|


|
 
.
p
r
o
j
e
c
t
-
l
o
c
a
l
 
M
i
B
 
n
o
w
 
|
 
4
5
0
0
.
9
4
 
|


|
 
r
e
c
l
a
i
m
e
d
 
M
i
B
 
|
 
3
1
6
.
7
9
 
|


|
 
g
i
t
 
p
a
c
k
 
M
i
B
 
n
o
w
 
|
 
2
1
0
.
4
 
|


|
 
t
h
i
r
d
-
p
a
r
t
y
 
f
u
l
l
 
c
o
p
i
e
s
 
t
r
a
c
k
e
d
 
|
 
3
 
|


|
 
s
p
i
l
l
 
o
b
j
e
c
t
s
 
m
i
g
r
a
t
e
d
 
|
 
1
0
 
|


|
 
e
m
p
t
y
 
l
e
g
a
c
y
 
d
i
r
e
c
t
o
r
i
e
s
 
c
l
e
a
r
e
d
 
|
 
3
 
|


#
#
 
R
e
m
a
i
n
i
n
g
 
e
x
c
e
p
t
i
o
n
s




|
 
A
r
e
a
 
|
 
S
t
a
t
e
 
|
 
E
x
c
e
p
t
i
o
n
 
|


|
-
-
-
|
-
-
-
|
-
-
-
|


|
 
t
h
i
r
d
-
p
a
r
t
y
 
l
o
c
k
 
|
 
R
E
P
O
R
T
E
D
_
N
O
T
_
F
I
X
E
D
 
|
 
7
 
o
f
 
4
6
 
s
o
u
r
c
e
s
.
l
o
c
k
 
e
n
t
r
i
e
s
 
c
a
r
r
y
 
n
o
 
c
a
n
o
n
i
c
a
l
 
U
R
L
 
a
n
d
 
0
 
c
a
r
r
y
 
a
 
p
i
n
n
e
d
 
r
e
v
i
s
i
o
n
;
 
t
h
e
 
l
o
c
k
 
r
e
c
o
r
d
s
 
w
h
a
t
 
i
s
 
a
b
s
o
r
b
e
d
,
 
n
o
t
 
w
h
e
r
e
 
t
o
 
f
e
t
c
h
 
i
t
 
|


|
 
r
u
n
t
i
m
e
 
v
o
l
u
m
e
 
|
 
O
W
N
E
R
_
D
E
L
E
T
E
_
A
P
P
R
O
V
A
L
_
R
E
Q
U
I
R
E
D
 
|
 
.
p
r
o
j
e
c
t
-
l
o
c
a
l
 
h
o
l
d
s
 
e
v
i
d
e
n
c
e
-
b
e
a
r
i
n
g
 
r
u
n
 
d
i
r
e
c
t
o
r
i
e
s
 
l
e
f
t
 
i
n
 
p
l
a
c
e
 
a
t
 
O
W
N
E
R
_
D
E
L
E
T
E
_
A
P
P
R
O
V
A
L
_
R
E
Q
U
I
R
E
D
;
 
r
e
c
l
a
i
m
i
n
g
 
t
h
e
m
 
n
e
e
d
s
 
o
w
n
e
r
 
a
p
p
r
o
v
a
l
 
|


|
 
p
y
t
h
o
n
 
t
o
o
l
i
n
g
 
|
 
R
E
P
O
R
T
E
D
_
N
O
T
_
F
I
X
E
D
 
|
 
r
u
f
f
 
i
s
 
d
e
c
l
a
r
e
d
 
b
u
t
 
n
o
t
 
i
n
s
t
a
l
l
e
d
,
 
s
o
 
l
i
n
t
 
i
s
 
n
o
t
 
e
n
f
o
r
c
e
d
;
 
p
y
t
e
s
t
 
i
s
 
n
o
t
 
i
n
s
t
a
l
l
e
d
 
a
n
d
 
t
h
e
 
s
u
i
t
e
 
r
u
n
s
 
u
n
d
e
r
 
u
n
i
t
t
e
s
t
;
 
u
v
 
i
s
 
n
o
t
 
i
n
s
t
a
l
l
e
d
,
 
s
o
 
n
o
 
u
v
.
l
o
c
k
 
e
x
i
s
t
s
 
|


|
 
n
o
d
e
 
t
o
o
l
i
n
g
 
|
 
B
Y
_
D
E
S
I
G
N
 
|
 
n
o
 
p
r
o
d
u
c
t
 
N
o
d
e
 
p
a
c
k
a
g
e
 
e
x
i
s
t
s
:
 
t
h
e
 
o
n
l
y
 
m
a
n
i
f
e
s
t
 
b
e
l
o
n
g
s
 
t
o
 
t
h
e
 
g
a
m
e
-
v
i
s
u
a
l
 
f
i
x
t
u
r
e
,
 
a
n
d
 
t
h
e
r
e
 
i
s
 
n
o
 
l
o
c
k
f
i
l
e
 
|


|
 
t
r
a
c
k
e
d
 
b
a
c
k
u
p
s
 
|
 
R
E
P
O
R
T
E
D
_
N
O
T
_
F
I
X
E
D
 
|
 
d
e
s
i
g
n
-
l
a
b
/
c
o
n
f
i
g
/
c
a
p
a
b
i
l
i
t
y
-
i
n
d
e
x
-
v
1
-
b
a
c
k
u
p
.
j
s
o
n
 
(
4
4
5
 
K
B
)
 
i
s
 
s
t
i
l
l
 
t
r
a
c
k
e
d
 
|


|
 
l
e
g
a
c
y
 
p
a
c
k
a
g
e
 
|
 
R
E
P
O
R
T
E
D
_
N
O
T
_
F
I
X
E
D
 
|
 
d
e
s
i
g
n
-
l
a
b
/
c
o
r
e
 
i
s
 
a
n
 
u
n
u
s
e
d
 
l
e
g
a
c
y
 
p
a
c
k
a
g
e
 
o
u
t
s
i
d
e
 
t
h
e
 
d
e
c
l
a
r
e
d
 
l
a
y
o
u
t
 
|


|
 
e
m
p
t
y
 
d
i
r
e
c
t
o
r
y
 
|
 
R
E
P
O
R
T
E
D
_
N
O
T
_
F
I
X
E
D
 
|
 
s
e
r
v
i
c
e
s
/
 
i
s
 
a
n
 
e
m
p
t
y
 
t
r
a
c
k
e
d
-
a
d
j
a
c
e
n
t
 
d
i
r
e
c
t
o
r
y
 
(
E
M
P
T
Y
_
D
I
R
 
d
e
v
i
a
t
i
o
n
 
i
n
 
t
h
e
 
d
i
r
e
c
t
o
r
y
 
a
u
d
i
t
)
 
|


|
 
l
i
v
e
 
d
a
t
a
b
a
s
e
 
|
 
N
O
T
_
V
E
R
I
F
I
A
B
L
E
_
A
S
_
S
T
A
T
E
D
 
|
 
.
p
r
o
j
e
c
t
-
l
o
c
a
l
/
s
t
a
t
e
/
 
d
o
e
s
 
n
o
t
 
e
x
i
s
t
,
 
s
o
 
a
 
c
l
a
i
m
 
t
h
a
t
 
'
t
h
e
 
l
i
v
e
 
d
a
t
a
b
a
s
e
 
i
s
 
u
n
m
o
d
i
f
i
e
d
'
 
i
s
 
n
o
t
 
v
e
r
i
f
i
a
b
l
e
 
a
s
 
s
t
a
t
e
d
;
 
t
h
e
 
p
r
o
x
y
 
u
s
e
d
 
i
s
 
t
h
a
t
 
n
o
 
*
.
d
b
 
u
n
d
e
r
 
.
p
r
o
j
e
c
t
-
l
o
c
a
l
 
c
h
a
n
g
e
d
 
|


|
 
a
g
e
n
t
-
n
a
t
i
v
e
 
a
r
t
i
f
a
c
t
 
|
 
R
E
F
U
S
E
D
_
B
Y
_
P
O
L
I
C
Y
 
|
 
.
h
e
r
m
e
s
/
s
k
i
l
l
-
c
a
l
l
-
i
n
d
e
x
.
j
s
o
n
 
i
s
 
n
o
t
 
p
r
o
v
a
b
l
y
 
D
E
S
I
G
N
-
L
A
B
-
o
w
n
e
d
 
a
n
d
 
i
s
 
l
e
f
t
 
u
n
t
o
u
c
h
e
d
 
(
D
O
_
N
O
T
_
T
O
U
C
H
)
 
|


|
 
m
e
a
s
u
r
e
m
e
n
t
 
|
 
W
I
T
H
D
R
A
W
N
_
C
L
A
I
M
 
|
 
n
o
 
l
i
k
e
-
f
o
r
-
l
i
k
e
 
b
e
f
o
r
e
/
a
f
t
e
r
 
e
x
i
s
t
s
 
f
o
r
 
t
h
e
 
r
u
n
t
i
m
e
 
r
o
o
t
s
 
o
r
 
t
h
e
 
g
i
t
 
p
a
c
k
,
 
s
o
 
t
h
e
 
o
n
l
y
 
r
e
d
u
c
t
i
o
n
 
c
l
a
i
m
e
d
 
i
s
 
t
h
e
 
d
i
g
e
s
t
-
b
a
c
k
e
d
 
r
e
c
l
a
i
m
e
d
 
b
y
t
e
 
c
o
u
n
t
 
|


#
#
 
W
h
a
t
 
i
s
 
N
O
T
 
c
l
a
i
m
e
d




*
 
D
E
S
I
G
N
-
L
A
B
 
p
r
o
d
u
c
t
 
c
o
m
p
l
e
t
e


*
 
P
h
o
t
o
s
h
o
p
 
i
n
t
e
g
r
a
t
e
d
 
E
3


*
 
I
l
l
u
s
t
r
a
t
o
r
 
i
n
t
e
g
r
a
t
e
d
 
E
3


*
 
O
p
e
n
D
e
s
i
g
n
 
i
n
t
e
g
r
a
t
e
d
 
E
3


*
 
C
o
m
f
y
U
I
 
p
r
o
d
u
c
t
i
o
n
 
r
e
a
d
y


*
 
B
l
e
n
d
e
r
 
i
n
t
e
g
r
a
t
e
d


*
 
M
i
n
i
M
a
x
 
v
a
l
i
d
a
t
e
d


*
 
p
r
o
f
e
s
s
i
o
n
a
l
 
d
e
s
i
g
n
 
q
u
a
l
i
t
y
 
p
a
s
s
e
d


*
 
H
u
m
a
n
 
J
u
r
y
 
p
a
s
s
e
d


*
 
r
e
l
e
a
s
e
 
r
e
a
d
y


#
#
 
C
o
d
e
x
 
s
t
a
r
t
i
n
g
 
p
o
i
n
t




C
o
n
t
r
a
c
t
,
 
f
i
x
t
u
r
e
s
,
 
c
o
m
m
a
n
d
 
o
u
t
l
i
n
e
s
,
 
e
v
i
d
e
n
c
e
 
t
e
m
p
l
a
t
e
s
,
 
d
o
-
n
o
t
-
c
l
a
i
m
 
l
i
s
t
s
 
a
n
d
 
r
o
l
l
b
a
c
k
 
e
x
p
e
c
t
a
t
i
o
n
s
 
f
o
r
 
e
i
g
h
t
 
d
o
m
a
i
n
s
 
a
r
e
 
i
n
 
`
d
o
c
s
/
t
a
s
k
p
a
c
k
s
/
D
E
S
I
G
N
-
L
A
B
-
C
O
D
E
X
-
R
E
A
L
-
H
O
S
T
-
H
A
N
D
O
F
F
.
m
d
`
.


C
o
d
e
x
 
d
o
e
s
 
n
o
t
 
n
e
e
d
 
t
o
 
r
e
p
e
a
t
 
r
e
p
o
s
i
t
o
r
y
 
c
l
e
a
n
u
p
,
 
l
a
n
g
u
a
g
e
 
p
l
a
n
n
i
n
g
,
 
D
B
 
s
c
h
e
m
a
 
r
e
f
a
c
t
o
r
i
n
g
,
 
d
i
r
e
c
t
o
r
y
 
m
i
g
r
a
t
i
o
n
,
 
t
h
i
r
d
-
p
a
r
t
y
 
s
o
u
r
c
e
 
c
l
e
a
n
u
p
 
o
r
 
s
p
i
l
l
 
c
l
e
a
n
u
p
.

